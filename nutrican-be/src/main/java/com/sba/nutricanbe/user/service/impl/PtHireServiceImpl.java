package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.dto.HirePtRequest;
import com.sba.nutricanbe.user.dto.MappingSessionResponse;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtVenue;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.PtVenueRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.OfflineHireSessionService;
import com.sba.nutricanbe.user.service.PtHireService;
import com.sba.nutricanbe.user.service.PtVenueAvailabilityService;
import com.sba.nutricanbe.user.service.SlotHoldService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtHireServiceImpl implements PtHireService {

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final PtClientMappingRepository mappingRepository;
    private final PtVenueRepository venueRepository;
    private final PtVenueAvailabilityService venueAvailabilityService;
    private final OfflineHireSessionService offlineHireSessionService;
    private final PtMappingSessionRepository mappingSessionRepository;
    private final SlotHoldService slotHoldService;
    private final WebSocketSessionService webSocketSessionService;

    @Value("${app.payment.accepted-request-hours:24}")
    private long acceptedRequestHours;

    @Override
    @Transactional
    public ApiResponse<PtClientMappingResponse> hirePt(
            UUID ptId, UUID customerId, HirePtRequest request) {
        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));
        if (pt.getRole() != UserRole.PT_CERTIFIED && pt.getRole() != UserRole.PT_FREELANCE) {
            throw new BadRequestException("User is not a PT");
        }

        PtProfile profile = ptProfileRepository.findByUserId(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));
        if (!Boolean.TRUE.equals(profile.getIsVerified())) {
            throw new BadRequestException("PT must be verified before accepting clients");
        }

        // Serialize hire requests per customer so double-clicks cannot create
        // two concurrent open contracts.
        User customer = userRepository.findByIdForUpdate(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", customerId));
        if (!customer.hasCustomerPrivileges()) {
            throw new BadRequestException("Only customers can hire a PT");
        }
        if (pt.getId().equals(customer.getId())) {
            throw new BadRequestException("You cannot hire yourself");
        }

        TrainingMode selectedMode = request.getTrainingMode();
        if (selectedMode == TrainingMode.BOTH) {
            throw new BadRequestException("Please select either ONLINE or OFFLINE coaching");
        }
        boolean modeAvailable = profile.getTrainingMode() == TrainingMode.BOTH
                || profile.getTrainingMode() == selectedMode;
        if (!modeAvailable) {
            throw new BadRequestException("This PT does not offer the selected coaching mode");
        }

        HireComputation comp = computeHire(ptId, profile, selectedMode, request);

        assertNoConflictingOpenMapping(customerId, ptId);
        mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, customerId)
                .ifPresent(this::assertExistingMappingNotOpen);

        // Each new hire is a separate coaching contract. Keeping the previous
        // mapping immutable preserves its payment and escrow history.
        PtClientMapping mapping = buildPendingMapping(pt, customer, selectedMode, comp);
        mapping = mappingRepository.save(mapping);
        if (selectedMode == TrainingMode.OFFLINE && comp.validatedOffline() != null && comp.selectedVenue() != null) {
            offlineHireSessionService.persistSessionsAndHolds(
                    mapping.getId(), ptId, comp.selectedVenue(), comp.validatedOffline());
        }
        return ApiResponse.success(toMappingResponseWithSessions(mapping), "Hiring request sent");
    }

    private record HireComputation(
            BigDecimal agreedAmount,
            String agreedRateUnit,
            BigDecimal perSessionAmount,
            Integer sessionCount,
            UUID venueId,
            String venueName,
            String venueAddress,
            String venueMapsUrl,
            LocalDateTime firstSessionStart,
            LocalDateTime firstSessionEnd,
            OfflineHireSessionService.ValidatedOfflineHire validatedOffline,
            PtVenue selectedVenue) {
    }

    private HireComputation computeHire(
            UUID ptId, PtProfile profile, TrainingMode selectedMode, HirePtRequest request) {
        BigDecimal perSessionAmount = null;
        Integer sessionCount = null;
        BigDecimal agreedAmount;
        String agreedRateUnit = selectedMode == TrainingMode.ONLINE
                ? profile.getOnlineRateUnit() : profile.getOfflineRateUnit();
        if (selectedMode == TrainingMode.ONLINE) {
            agreedAmount = profile.getOnlineRate();
        } else {
            perSessionAmount = profile.getOfflineRate();
            agreedAmount = perSessionAmount;
        }
        if (agreedAmount == null || agreedAmount.signum() <= 0 || agreedRateUnit == null
                || agreedRateUnit.isBlank()) {
            throw new BadRequestException("The selected coaching package does not have a valid price");
        }

        UUID venueId = null;
        String venueName = null;
        String venueAddress = null;
        String venueMapsUrl = null;
        LocalDateTime firstSessionStart = null;
        LocalDateTime firstSessionEnd = null;
        OfflineHireSessionService.ValidatedOfflineHire validatedOffline = null;
        PtVenue selectedVenue = null;

        if (selectedMode == TrainingMode.OFFLINE) {
            if (request.getVenueId() == null) {
                throw new BadRequestException("Please select a training venue");
            }
            List<LocalDateTime> sessionStarts = request.resolvedSessionStarts();
            if (sessionStarts.isEmpty()) {
                throw new BadRequestException("Please select at least one session");
            }
            long activeVenues = venueRepository.countByPtProfile_IdAndActiveTrue(profile.getId());
            if (activeVenues == 0) {
                throw new BadRequestException("PT has not configured any training venues");
            }
            List<com.sba.nutricanbe.user.dto.PtAvailabilityWindowResponse> availability =
                    venueAvailabilityService.listAvailabilityForProfile(profile.getId());
            if (availability.isEmpty()) {
                throw new BadRequestException("PT has not configured availability");
            }
            selectedVenue = venueRepository.findByIdAndPtProfile_Id(request.getVenueId(), profile.getId())
                    .orElseThrow(() -> new BadRequestException("Selected venue is not valid for this PT"));
            if (!Boolean.TRUE.equals(selectedVenue.getActive())) {
                throw new BadRequestException("Selected venue is no longer available");
            }
            validatedOffline = offlineHireSessionService.validateOfflineSessions(
                    ptId, profile.getId(), availability, agreedRateUnit, sessionStarts, null);
            sessionCount = validatedOffline.sessionCount();
            agreedAmount = perSessionAmount.multiply(BigDecimal.valueOf(sessionCount));
            firstSessionStart = validatedOffline.earliestStart();
            firstSessionEnd = validatedOffline.earliestEnd();
            venueId = selectedVenue.getId();
            venueName = selectedVenue.getName();
            venueAddress = selectedVenue.getAddress();
            venueMapsUrl = selectedVenue.getMapsUrl();
        }

        return new HireComputation(agreedAmount, agreedRateUnit, perSessionAmount, sessionCount,
                venueId, venueName, venueAddress, venueMapsUrl,
                firstSessionStart, firstSessionEnd, validatedOffline, selectedVenue);
    }

    private void assertNoConflictingOpenMapping(UUID customerId, UUID ptId) {
        mappingRepository.findFirstByClient_IdAndStatusIn(
                        customerId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))
                .ifPresent(active -> {
                    if (!active.getPt().getId().equals(ptId)) {
                        throw new BadRequestException("Bạn đang có PT. Kết thúc coaching hiện tại trước.");
                    }
                });

        mappingRepository.findFirstByClient_IdAndStatusIn(
                        customerId, List.of(ClientMappingStatus.PENDING, ClientMappingStatus.AWAITING_PAYMENT))
                .ifPresent(openRequest -> {
                    if (!openRequest.getPt().getId().equals(ptId)) {
                        throw new BadRequestException(
                                "You already have another coaching request in progress");
                    }
                });
    }

    private void assertExistingMappingNotOpen(PtClientMapping existing) {
        if (existing.getStatus() == ClientMappingStatus.ACTIVE) {
            throw new BadRequestException("Bạn đã liên kết với Huấn luyện viên này rồi.");
        }
        if (existing.getStatus() == ClientMappingStatus.PENDING) {
            throw new BadRequestException("Bạn đã gửi yêu cầu trước đó, vui lòng chờ PT xác nhận.");
        }
        if (existing.getStatus() == ClientMappingStatus.AWAITING_PAYMENT) {
            throw new BadRequestException("PT has accepted. Please complete payment first.");
        }
        if (existing.getStatus() == ClientMappingStatus.END_REQUESTED) {
            throw new BadRequestException(
                    "Please complete the current coaching termination first");
        }
    }

    private PtClientMapping buildPendingMapping(
            User pt, User customer, TrainingMode selectedMode, HireComputation comp) {
        return PtClientMapping.builder()
                .pt(pt)
                .client(customer)
                .status(ClientMappingStatus.PENDING)
                .selectedTrainingMode(selectedMode)
                .agreedAmount(comp.agreedAmount())
                .agreedRateUnit(comp.agreedRateUnit())
                .perSessionAmount(comp.perSessionAmount())
                .sessionCount(comp.sessionCount())
                .venueId(comp.venueId())
                .venueName(comp.venueName())
                .venueAddress(comp.venueAddress())
                .venueMapsUrl(comp.venueMapsUrl())
                .firstSessionStart(comp.firstSessionStart())
                .firstSessionEnd(comp.firstSessionEnd())
                .build();
    }

    @Override
    @Transactional
    public ApiResponse<PtClientMappingResponse> updateHireRequest(UUID clientId, UUID ptId, String action) {
        PtClientMapping mapping = mappingRepository
                .findTopByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, clientId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", clientId));

        if (mapping.getStatus() != ClientMappingStatus.PENDING) {
            throw new BadRequestException("Only pending hiring requests can be updated");
        }

        String normalized = action != null ? action.trim().toUpperCase() : "";
        switch (normalized) {
            case "ACCEPT" -> {
                PtProfile profile = ptProfileRepository.findByUserIdForUpdate(ptId)
                        .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));
                int max = profile.getMaxClients() != null ? profile.getMaxClients() : 10;
                long reservedSlots = mappingRepository.countByPt_IdAndStatusIn(
                        ptId,
                        List.of(
                                ClientMappingStatus.AWAITING_PAYMENT,
                                ClientMappingStatus.ACTIVE,
                                ClientMappingStatus.END_REQUESTED));
                if (reservedSlots >= max) {
                    throw new BadRequestException("PT đã đủ số client tối đa (" + max + ")");
                }
                if (mapping.getSelectedTrainingMode() == TrainingMode.OFFLINE) {
                    offlineHireSessionService.revalidateForAccept(
                            ptId, mapping.getId(), mapping.getAgreedRateUnit());
                }
                mapping.setStatus(ClientMappingStatus.AWAITING_PAYMENT);
                mapping.setAcceptedAt(LocalDateTime.now());
                mapping.setPaymentDueAt(LocalDateTime.now()
                        .plusHours(Math.max(1, acceptedRequestHours)));
            }
            case "REJECT", "DECLINE" -> {
                mapping.setStatus(ClientMappingStatus.INACTIVE);
                mapping.setAcceptedAt(null);
                mapping.setPaymentDueAt(null);
                slotHoldService.releaseByMapping(mapping.getId());
            }
            default -> throw new BadRequestException("Invalid action: " + action);
        }

        mapping = mappingRepository.save(mapping);
        String message = mapping.getStatus() == ClientMappingStatus.AWAITING_PAYMENT
                ? "Hiring request accepted. Waiting for customer payment."
                : "Hiring request rejected";
        notifyHireResult(mapping, mapping.getStatus() == ClientMappingStatus.AWAITING_PAYMENT);
        return ApiResponse.success(toMappingResponseWithSessions(mapping), message);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtClientMappingResponse> getOpenHireRequest(UUID customerId) {
        PtClientMappingResponse response = mappingRepository.findFirstByClient_IdAndStatusIn(
                        customerId,
                        List.of(ClientMappingStatus.PENDING, ClientMappingStatus.AWAITING_PAYMENT))
                .map(this::toMappingResponseWithSessions)
                .orElse(null);
        return ApiResponse.success(response);
    }

    private PtClientMappingResponse toMappingResponseWithSessions(PtClientMapping mapping) {
        List<MappingSessionResponse> sessions = mappingSessionRepository
                .findByMappingIdOrderBySequenceAsc(mapping.getId())
                .stream()
                .map(MappingSessionResponse::from)
                .toList();
        return PtClientMappingResponse.toMappingResponse(mapping, sessions);
    }

    private void notifyHireResult(PtClientMapping mapping, boolean accepted) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("mappingId", mapping.getId());
        payload.put("ptId", mapping.getPt().getId());
        payload.put("customerId", mapping.getClient().getId());
        payload.put("accepted", accepted);
        payload.put("message", accepted
                ? "PT đã chấp nhận. Vui lòng thanh toán để bắt đầu coaching."
                : "PT đã từ chối yêu cầu coaching.");
        String event = accepted ? "HIRE_ACCEPTED" : "HIRE_REJECTED";
        webSocketSessionService.sendToUser(mapping.getClient().getId(), event, payload);
    }
}
