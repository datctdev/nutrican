package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.diet.entity.SelfPlanSubmission;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;
import com.sba.nutricanbe.diet.repository.SelfPlanItemRepository;
import com.sba.nutricanbe.diet.repository.SelfPlanSubmissionRepository;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.dto.CoachingHistoryDto;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.CoachingEndRequestedBy;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.enums.TerminationReason;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.ReviewRepository;
import com.sba.nutricanbe.user.service.CoachingLifecycleService;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CoachingLifecycleServiceImpl implements CoachingLifecycleService {

    private final PtClientMappingRepository mappingRepository;
    private final PtProfileRepository ptProfileRepository;
    private final WebSocketSessionService webSocketSessionService;
    private final ReviewRepository reviewRepository;
    private final CoachingWalletService coachingWalletService;
    private final SelfPlanSubmissionRepository selfPlanSubmissionRepository;
    private final SelfPlanItemRepository selfPlanItemRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public PtClientMappingResponse requestEndCoaching(UUID actorId, UUID clientId, boolean actorIsPt) {
        PtClientMapping mapping = resolveActiveMapping(actorId, clientId, actorIsPt);
        if (mapping.getStatus() == ClientMappingStatus.END_REQUESTED) {
            throw new BadRequestException("End coaching already requested");
        }
        mapping.setStatus(ClientMappingStatus.END_REQUESTED);
        mapping.setEndRequestedBy(actorIsPt ? CoachingEndRequestedBy.PT : CoachingEndRequestedBy.CUSTOMER);
        mapping.setEndRequestedAt(LocalDateTime.now());
        mapping = mappingRepository.save(mapping);
        notifyEndCoachingRequest(mapping, actorIsPt);
        return PtClientMappingResponse.toMappingResponse(mapping);
    }

    private void notifyEndCoachingRequest(PtClientMapping mapping, boolean actorIsPt) {
        UUID recipientId = actorIsPt ? mapping.getClient().getId() : mapping.getPt().getId();
        Map<String, Object> payload = new HashMap<>();
        payload.put("mappingId", mapping.getId());
        payload.put("clientId", mapping.getClient().getId());
        payload.put("requestedBy", actorIsPt ? "PT" : "CUSTOMER");
        webSocketSessionService.sendToUser(recipientId, "COACHING_END_REQUESTED", payload);
    }

    @Override
    @Transactional
    public PtClientMappingResponse confirmEndCoaching(UUID actorId, UUID clientId, boolean actorIsPt) {
        PtClientMapping mapping = resolveActiveMapping(actorId, clientId, actorIsPt);
        if (mapping.getStatus() != ClientMappingStatus.END_REQUESTED) {
            throw new BadRequestException("No pending end coaching request");
        }
        CoachingEndRequestedBy requester = mapping.getEndRequestedBy();
        if (requester == null) {
            throw new BadRequestException("Invalid end request state");
        }
        boolean confirmByPt = actorIsPt;
        boolean confirmByCustomer = !actorIsPt;
        if (requester == CoachingEndRequestedBy.PT && confirmByPt) {
            throw new BadRequestException("Waiting for customer confirmation");
        }
        if (requester == CoachingEndRequestedBy.CUSTOMER && confirmByCustomer) {
            throw new BadRequestException("Waiting for PT confirmation");
        }
        mapping.setStatus(ClientMappingStatus.COMPLETED);
        mapping.setCompletedAt(LocalDateTime.now());
        mapping.setTerminationReason(TerminationReason.NORMAL_COMPLETION);
        PtClientMapping saved = mappingRepository.save(mapping);
        coachingWalletService.releaseEscrowIfPresent(saved.getId());
        autoRejectPendingSubmissions(saved);
        Map<String, Object> completedPayload = new HashMap<>();
        completedPayload.put("mappingId", saved.getId());
        completedPayload.put("clientId", saved.getClient().getId());
        completedPayload.put("ptId", saved.getPt().getId());
        completedPayload.put("message", "Coaching đã hoàn tất và tiền escrow đã được quyết toán.");
        webSocketSessionService.sendToUser(saved.getClient().getId(), "COACHING_COMPLETED", completedPayload);
        webSocketSessionService.sendToUser(saved.getPt().getId(), "COACHING_COMPLETED", completedPayload);
        return PtClientMappingResponse.toMappingResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CoachingHistoryDto> getCoachingHistory(UUID customerId) {
        return mappingRepository.findByClient_IdAndStatusOrderByCompletedAtDesc(
                        customerId, ClientMappingStatus.COMPLETED).stream()
                .map(m -> {
                    boolean hasReviewed = reviewRepository.existsByPtIdAndReviewerId(m.getPt().getId(), customerId);

                    PtProfile profile = ptProfileRepository.findByUserId(m.getPt().getId()).orElse(null);
                    UUID profileId = (profile != null) ? profile.getId() : null;

                    return CoachingHistoryDto.builder()
                            .mappingId(m.getId())
                            .ptId(m.getPt().getId())
                            .ptProfileId(profileId)
                            .ptName(m.getPt().getFullName())
                            .ptAvatarUrl(m.getPt().getAvatarUrl())
                            .status(m.getStatus())
                            .completedAt(m.getCompletedAt())
                            .assignedAt(m.getAssignedAt())
                            .hasReviewed(hasReviewed)
                            .build();
                })
                .toList();
    }

    @Override
    @Transactional
    public void setMaxClients(UUID ptUserId, Integer maxClients) {
        if (maxClients == null) {
            throw new BadRequestException("maxClients is required");
        }
        if (maxClients < 1 || maxClients > 20) {
            throw new BadRequestException("maxClients must be between 1 and 20");
        }
        PtProfile profile = ptProfileRepository.findByUserId(ptUserId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptUserId));
        profile.setMaxClients(maxClients);
        ptProfileRepository.save(profile);
    }

    private PtClientMapping resolveActiveMapping(UUID actorId, UUID clientId, boolean actorIsPt) {
        PtClientMapping mapping;
        if (actorIsPt) {
            mapping = mappingRepository
                    .findTopByPt_IdAndClient_IdOrderByCreatedAtDesc(actorId, clientId)
                    .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", clientId));
            if (mapping.getStatus() != ClientMappingStatus.ACTIVE
                    && mapping.getStatus() != ClientMappingStatus.END_REQUESTED) {
                throw new BadRequestException("Client not active for this PT");
            }
        } else {
            if (!actorId.equals(clientId)) {
                throw new UnauthorizedException("Cannot act on another customer");
            }
            mapping = mappingRepository
                    .findTopByClient_IdAndStatusOrderByCreatedAtDesc(
                            clientId, ClientMappingStatus.ACTIVE)
                    .or(() -> mappingRepository
                            .findTopByClient_IdAndStatusOrderByCreatedAtDesc(
                                    clientId, ClientMappingStatus.END_REQUESTED))
                    .orElseThrow(() -> new BadRequestException("No active coaching relationship"));
        }
        return mapping;
    }

    private void autoRejectPendingSubmissions(PtClientMapping mapping) {
        if (mapping.getClient() == null || mapping.getPt() == null) {
            return;
        }
        List<SelfPlanSubmission> pending = selfPlanSubmissionRepository.findByCustomerIdAndPtIdAndStatus(
                mapping.getClient().getId(),
                mapping.getPt().getId(),
                SelfPlanSubmissionStatus.PENDING);
        if (pending.isEmpty()) {
            return;
        }
        String systemReason = "Đề xuất tự động bị huỷ do kết thúc hợp đồng PT";
        pending.forEach(submission -> {
            submission.setStatus(SelfPlanSubmissionStatus.REJECTED);
            submission.setPtNote(systemReason);
            submission.setDecidedAt(LocalDateTime.now());
            submission.setPendingUniqueKey(null);
            var items = selfPlanItemRepository.findBySubmissionId(submission.getId());
            items.forEach(item -> {
                item.setLockedByReview(false);
                item.setSubmissionId(null);
            });
            selfPlanItemRepository.saveAll(items);
            notificationService.notify(submission.getCustomerId(), NotificationPayload.builder()
                    .type("SELF_PLAN_REJECTED")
                    .title("Yêu cầu thay món đã được đóng")
                    .body(systemReason)
                    .linkType(NotificationLinkType.MEAL_PLAN)
                    .linkRefId(submission.getCustomerId())
                    .sendEmail(false)
                    .build());
        });
        selfPlanSubmissionRepository.saveAll(pending);
    }
}
