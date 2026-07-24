package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.AddMappingSessionRequest;
import com.sba.nutricanbe.user.dto.AppointmentActionRequest;
import com.sba.nutricanbe.user.dto.AppointmentResponse;
import com.sba.nutricanbe.user.dto.BookAppointmentRequest;
import com.sba.nutricanbe.user.dto.CancelAppointmentRequest;
import com.sba.nutricanbe.user.dto.RescheduleAppointmentRequest;
import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtMappingSession;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.AppointmentCancelType;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.MappingSessionStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.AppointmentService;
import com.sba.nutricanbe.user.service.AppointmentSlotHelper;
import com.sba.nutricanbe.user.service.OfflinePackageAppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppointmentServiceImpl implements AppointmentService {

    private static final int CUSTOMER_NO_FEE_CANCEL_HOURS = 48;
    private static final int PENDING_EXPIRY_HOURS = 24;

    private final PtAppointmentRepository appointmentRepository;
    private final PtClientMappingRepository mappingRepository;
    private final PtMappingSessionRepository mappingSessionRepository;
    private final CoachingWalletService walletService;
    private final AppointmentSlotHelper appointmentSlotHelper;
    private final PtProfileRepository ptProfileRepository;
    private final OfflinePackageAppointmentService offlinePackageAppointmentService;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public AppointmentResponse book(UUID customerId, UUID ptId, BookAppointmentRequest request) {
        throw new BadRequestException(
                "Không thể đặt lịch trống. Với coaching offline, vui lòng mua thêm buổi từ mục Coaching.");
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResponse> upcomingForCustomer(UUID customerId) {
        return toResponses(appointmentRepository.findByClientIdAndStatusInOrderByStartTimeAsc(
                customerId, List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED)));
    }

    @Override
    @Transactional
    public List<AppointmentResponse> upcomingForPt(UUID ptId) {
        expireStale();
        return toResponses(appointmentRepository.findByPtIdAndStatusInOrderByStartTimeAsc(
                ptId, List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED)));
    }

    @Override
    @Transactional
    public AppointmentResponse updateByPt(UUID ptId, UUID appointmentId, AppointmentActionRequest request) {
        PtAppointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));
        if (!appt.getPtId().equals(ptId)) {
            throw new BadRequestException("Đây không phải lịch hẹn của bạn");
        }

        BigDecimal refunded = BigDecimal.ZERO;
        if ("CONFIRM".equalsIgnoreCase(request.getAction())) {
            if (appt.getStatus() != AppointmentStatus.PENDING) {
                throw new BadRequestException("Chỉ xác nhận được lịch đang chờ");
            }
            appt.setStatus(AppointmentStatus.CONFIRMED);
        } else if ("CANCEL".equalsIgnoreCase(request.getAction())) {
            if (appt.getStatus() != AppointmentStatus.PENDING && appt.getStatus() != AppointmentStatus.CONFIRMED) {
                throw new BadRequestException("Không thể hủy lịch hẹn ở trạng thái hiện tại");
            }
            if (appt.getStartTime() != null && !appt.getStartTime().isAfter(DietDates.nowVn())) {
                throw new BadRequestException("Không thể hủy buổi đã bắt đầu hoặc đã qua giờ");
            }
            Optional<PtMappingSession> linked = resolveLinkedSession(appt);
            if (linked.isPresent() && linked.get().getStatus() != MappingSessionStatus.SCHEDULED) {
                throw new BadRequestException(
                        "Buổi này không còn ở trạng thái chờ dạy — không thể hủy / hoàn tiền");
            }
            refunded = cancelLinkedSessionAndRefund(appt, "PT");
            appt.setStatus(AppointmentStatus.CANCELLED);
            appt.setCancelledBy("PT");
            appt.setCancelType(AppointmentCancelType.BY_PT);
        } else {
            throw new BadRequestException("Thao tác không hợp lệ");
        }

        PtAppointment saved = appointmentRepository.save(appt);
        return toResponse(saved, refunded);
    }

    @Override
    @Transactional
    public AppointmentResponse cancelByCustomer(UUID customerId, UUID appointmentId, CancelAppointmentRequest request) {
        PtAppointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));
        if (!appt.getClientId().equals(customerId)) {
            throw new BadRequestException("Đây không phải lịch hẹn của bạn");
        }
        if (appt.getStatus() != AppointmentStatus.PENDING && appt.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new BadRequestException("Không thể hủy lịch hẹn ở trạng thái hiện tại");
        }
        if (appt.getStartTime() == null || !appt.getStartTime().isAfter(DietDates.nowVn())) {
            throw new BadRequestException("Không thể hủy buổi đã bắt đầu hoặc đã qua giờ");
        }

        Optional<PtMappingSession> linked = resolveLinkedSession(appt);
        if (linked.isPresent() && linked.get().getStatus() != MappingSessionStatus.SCHEDULED) {
            throw new BadRequestException(
                    "Buổi này không còn ở trạng thái chờ dạy — không thể hủy / hoàn tiền");
        }

        long hoursUntil = Duration.between(DietDates.nowVn(), appt.getStartTime()).toHours();
        boolean noFee = hoursUntil >= CUSTOMER_NO_FEE_CANCEL_HOURS;
        appt.setStatus(AppointmentStatus.CANCELLED);
        appt.setCancelledBy("CUSTOMER");
        appt.setCancelType(noFee ? AppointmentCancelType.NO_FEE : AppointmentCancelType.LATE);
        if (request != null && request.getReason() != null) {
            appt.setCancelReason(request.getReason());
        }

        // ≥48h: hoàn ví HV. <48h (LATE): không hoàn — forfeit release cho PT (không tăng free capacity giả).
        BigDecimal refunded = settleCancelledSession(
                appt, "CUSTOMER", noFee ? CancelMoneyPolicy.REFUND_CUSTOMER : CancelMoneyPolicy.FORFEIT_TO_PT);
        PtAppointment saved = appointmentRepository.save(appt);
        return toResponse(saved, refunded);
    }

    private enum CancelMoneyPolicy {
        REFUND_CUSTOMER,
        FORFEIT_TO_PT
    }

    /** Hủy session SCHEDULED rồi hoàn ví HV hoặc forfeit cho PT. */
    private BigDecimal settleCancelledSession(PtAppointment appt, String actor, CancelMoneyPolicy policy) {
        Optional<PtMappingSession> sessionOpt = resolveLinkedSession(appt);
        if (sessionOpt.isEmpty()) {
            return BigDecimal.ZERO;
        }
        PtMappingSession session = sessionOpt.get();
        if (session.getStatus() != MappingSessionStatus.SCHEDULED) {
            return BigDecimal.ZERO;
        }
        session.setStatus(MappingSessionStatus.CANCELLED);
        mappingSessionRepository.save(session);

        if (appt.getMappingId() == null) {
            return BigDecimal.ZERO;
        }
        PtClientMapping mapping = mappingRepository.findById(appt.getMappingId()).orElse(null);
        if (mapping == null || mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            return BigDecimal.ZERO;
        }
        BigDecimal perSession = mapping.getPerSessionAmount();
        if (perSession == null || perSession.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal remaining = walletService.getRemainingEscrow(mapping.getId());
        if (remaining.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal amount = perSession.min(remaining);
        if (policy == CancelMoneyPolicy.REFUND_CUSTOMER) {
            walletService.refundToCustomer(
                    mapping.getId(),
                    amount,
                    "MAPPING_SESSION",
                    session.getId(),
                    "Cancel unused offline session (" + actor + ")");
            return amount;
        }
        // LATE forfeit — tiền về PT, không hoàn HV, không để free capacity ảo
        walletService.releaseToPt(
                mapping.getId(),
                amount,
                "MAPPING_SESSION_LATE",
                session.getId(),
                "Late cancel — forfeit offline session to PT (" + actor + ")");
        session.setReleasedAmount(amount);
        mappingSessionRepository.save(session);
        return BigDecimal.ZERO;
    }

    /** @deprecated use settleCancelledSession — giữ tên cũ cho PT cancel path */
    private BigDecimal cancelLinkedSessionAndRefund(PtAppointment appt, String actor) {
        return settleCancelledSession(appt, actor, CancelMoneyPolicy.REFUND_CUSTOMER);
    }

    private Optional<PtMappingSession> resolveLinkedSession(PtAppointment appt) {
        if (appt.getMappingSessionId() != null) {
            return mappingSessionRepository.findById(appt.getMappingSessionId());
        }
        if (appt.getMappingId() == null || appt.getStartTime() == null) {
            return Optional.empty();
        }
        return mappingSessionRepository.findByMappingIdOrderBySequenceAsc(appt.getMappingId()).stream()
                .filter(s -> s.getStartTime().equals(appt.getStartTime()))
                .findFirst();
    }

    private void expireStale() {
        LocalDateTime cutoff = DietDates.nowVn().minusHours(PENDING_EXPIRY_HOURS);
        List<PtAppointment> stale = appointmentRepository
                .findByStatusAndCreatedAtBefore(AppointmentStatus.PENDING, cutoff);
        if (stale.isEmpty()) {
            return;
        }
        stale.forEach(a -> a.setStatus(AppointmentStatus.EXPIRED));
        appointmentRepository.saveAll(stale);
    }

    @Override
    @Transactional
    public AppointmentResponse rescheduleByPt(UUID ptId, UUID appointmentId, RescheduleAppointmentRequest request) {
        if (request == null || request.getStartTime() == null) {
            throw new BadRequestException("Vui lòng chọn thời gian bắt đầu buổi tập mới");
        }
        PtAppointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));
        if (!appt.getPtId().equals(ptId)) {
            throw new BadRequestException("Đây không phải lịch hẹn của bạn");
        }
        if (appt.getStatus() != AppointmentStatus.PENDING && appt.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new BadRequestException("Không thể đổi lịch buổi ở trạng thái hiện tại");
        }
        if (appt.getStartTime() != null && !appt.getStartTime().isAfter(DietDates.nowVn())) {
            throw new BadRequestException("Không thể đổi lịch buổi đã bắt đầu hoặc đã qua giờ");
        }

        PtMappingSession session = resolveLinkedSession(appt)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy buổi coaching gắn với lịch hẹn này"));
        if (session.getStatus() != MappingSessionStatus.SCHEDULED) {
            throw new BadRequestException("Chỉ đổi được buổi đang ở trạng thái chờ dạy");
        }

        PtClientMapping mapping = appt.getMappingId() != null
                ? mappingRepository.findById(appt.getMappingId()).orElse(null) : null;
        if (mapping == null || mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            throw new BadRequestException("Chỉ đổi lịch được với gói coaching offline");
        }
        if (!mapping.getPt().getId().equals(ptId)) {
            throw new BadRequestException("Bạn không quản lý học viên của lịch này");
        }
        if (mapping.getStatus() != ClientMappingStatus.ACTIVE) {
            throw new BadRequestException("Chỉ đổi lịch khi quan hệ coaching đang ACTIVE");
        }

        LocalDateTime start = request.getStartTime();
        if (!start.isAfter(DietDates.nowVn())) {
            throw new BadRequestException("Thời gian mới phải bắt đầu trong tương lai");
        }
        LocalDateTime end = request.getEndTime() != null
                ? request.getEndTime()
                : appointmentSlotHelper.computeSessionEnd(start, mapping.getAgreedRateUnit());
        appointmentSlotHelper.validateSlot(start, end);
        appointmentSlotHelper.assertNoOverlap(ptId, start, end, appt.getId());

        PtProfile profile = ptProfileRepository.findByUserId(ptId)
                .orElseThrow(() -> new BadRequestException("PT chưa có hồ sơ để kiểm tra khung giờ nhận học viên"));
        appointmentSlotHelper.assertSlotWithinAvailability(profile.getId(), start, end);

        session.setStartTime(start);
        session.setEndTime(end);
        mappingSessionRepository.save(session);

        appt.setStartTime(start);
        appt.setEndTime(end);
        PtAppointment saved = appointmentRepository.save(appt);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public AppointmentResponse addSessionByPt(UUID ptId, UUID mappingId, AddMappingSessionRequest request) {
        if (request == null || request.getStartTime() == null) {
            throw new BadRequestException("Vui lòng chọn thời gian bắt đầu buổi tập");
        }
        PtClientMapping mapping = mappingRepository.findById(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", mappingId));
        if (!mapping.getPt().getId().equals(ptId)) {
            throw new BadRequestException("Bạn không quản lý học viên này");
        }
        if (mapping.getStatus() != ClientMappingStatus.ACTIVE) {
            throw new BadRequestException("Chỉ thêm buổi khi quan hệ coaching đang ACTIVE");
        }
        if (mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            throw new BadRequestException("Chỉ thêm buổi cho gói coaching offline");
        }
        BigDecimal perSession = mapping.getPerSessionAmount();
        if (perSession == null || perSession.signum() <= 0) {
            throw new BadRequestException("Gói offline thiếu đơn giá mỗi buổi");
        }

        // Buổi còn giữ tiền escrow: chưa dạy / chờ HV xác nhận / đang tranh chấp
        long committedSessions = mappingSessionRepository.findByMappingIdOrderBySequenceAsc(mappingId).stream()
                .filter(s -> s.getStatus() == MappingSessionStatus.SCHEDULED
                        || s.getStatus() == MappingSessionStatus.AWAITING_CONFIRM
                        || s.getStatus() == MappingSessionStatus.DISPUTED)
                .count();
        BigDecimal remaining = walletService.getRemainingEscrow(mappingId);
        BigDecimal committed = perSession.multiply(BigDecimal.valueOf(committedSessions));
        BigDecimal free = remaining.subtract(committed);
        if (free.compareTo(perSession) < 0) {
            throw new BadRequestException(
                    "Escrow không đủ cho buổi mới. Nhờ học viên mua thêm buổi (Extra sessions) rồi thử lại.");
        }

        LocalDateTime start = request.getStartTime();
        LocalDateTime end = request.getEndTime() != null
                ? request.getEndTime()
                : appointmentSlotHelper.computeSessionEnd(start, mapping.getAgreedRateUnit());
        appointmentSlotHelper.validateSlot(start, end);
        if (!start.isAfter(DietDates.nowVn())) {
            throw new BadRequestException("Buổi mới phải bắt đầu trong tương lai");
        }
        appointmentSlotHelper.assertNoOverlap(ptId, start, end, null);
        PtProfile profile = ptProfileRepository.findByUserId(ptId)
                .orElseThrow(() -> new BadRequestException("PT chưa có hồ sơ để kiểm tra khung giờ nhận học viên"));
        appointmentSlotHelper.assertSlotWithinAvailability(profile.getId(), start, end);

        int nextSeq = mappingSessionRepository.findByMappingIdOrderBySequenceAsc(mappingId).stream()
                .mapToInt(s -> s.getSequence() != null ? s.getSequence() : 0)
                .max()
                .orElse(0) + 1;

        PtMappingSession session = mappingSessionRepository.save(PtMappingSession.builder()
                .mappingId(mappingId)
                .sequence(nextSeq)
                .startTime(start)
                .endTime(end)
                .venueName(mapping.getVenueName())
                .venueAddress(mapping.getVenueAddress())
                .venueMapsUrl(mapping.getVenueMapsUrl())
                .status(MappingSessionStatus.SCHEDULED)
                .build());

        int newCount = (int) mappingSessionRepository.findByMappingIdOrderBySequenceAsc(mappingId).stream()
                .filter(s -> s.getStatus() != MappingSessionStatus.CANCELLED)
                .count();
        mapping.setSessionCount(newCount);
        mappingRepository.save(mapping);

        offlinePackageAppointmentService.materializeOfflinePackageIfNeeded(mapping);

        PtAppointment appt = appointmentRepository.findByMappingId(mappingId).stream()
                .filter(a -> a.getStatus() != AppointmentStatus.CANCELLED
                        && a.getStatus() != AppointmentStatus.EXPIRED)
                .filter(a -> session.getId().equals(a.getMappingSessionId())
                        || (a.getStartTime() != null && a.getStartTime().equals(start)))
                .findFirst()
                .orElse(null);
        if (appt == null) {
            appt = appointmentRepository.save(PtAppointment.builder()
                    .clientId(mapping.getClient().getId())
                    .ptId(ptId)
                    .mappingId(mappingId)
                    .mappingSessionId(session.getId())
                    .startTime(start)
                    .endTime(end)
                    .type("OFFLINE")
                    .note(request.getNote() != null ? request.getNote() : "Buổi offline thêm bởi PT")
                    .status(AppointmentStatus.CONFIRMED)
                    .venueName(mapping.getVenueName())
                    .venueAddress(mapping.getVenueAddress())
                    .venueMapsUrl(mapping.getVenueMapsUrl())
                    .build());
        } else if (appt.getMappingSessionId() == null) {
            appt.setMappingSessionId(session.getId());
            appt = appointmentRepository.save(appt);
        }
        return toResponse(appt);
    }

    private List<AppointmentResponse> toResponses(List<PtAppointment> appointments) {
        if (appointments == null || appointments.isEmpty()) {
            return List.of();
        }
        Set<UUID> ids = new HashSet<>();
        for (PtAppointment a : appointments) {
            collectParticipantIds(a, ids);
        }
        Map<UUID, String> names = resolveDisplayNames(ids);
        return appointments.stream()
                .map(a -> AppointmentResponse.from(
                        a, nameOf(names, a.getClientId()), nameOf(names, a.getPtId()), null))
                .toList();
    }

    private AppointmentResponse toResponse(PtAppointment appointment) {
        return toResponse(appointment, null);
    }

    private AppointmentResponse toResponse(PtAppointment appointment, BigDecimal refundedAmount) {
        if (appointment == null) {
            return null;
        }
        Set<UUID> ids = new HashSet<>();
        collectParticipantIds(appointment, ids);
        Map<UUID, String> names = resolveDisplayNames(ids);
        return AppointmentResponse.from(
                appointment,
                nameOf(names, appointment.getClientId()),
                nameOf(names, appointment.getPtId()),
                refundedAmount);
    }

    private static void collectParticipantIds(PtAppointment appointment, Set<UUID> target) {
        if (appointment.getClientId() != null) {
            target.add(appointment.getClientId());
        }
        if (appointment.getPtId() != null) {
            target.add(appointment.getPtId());
        }
    }

    private Map<UUID, String> resolveDisplayNames(Collection<UUID> userIds) {
        Map<UUID, String> names = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) {
            return names;
        }
        List<User> users = userRepository.findAllById(userIds);
        if (users == null || users.isEmpty()) {
            return names;
        }
        for (User u : users) {
            names.put(
                    u.getId(),
                    u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : u.getEmail());
        }
        return names;
    }

    private static String nameOf(Map<UUID, String> names, UUID userId) {
        return userId != null ? names.get(userId) : null;
    }
}

