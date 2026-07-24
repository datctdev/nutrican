package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtMappingSession;
import com.sba.nutricanbe.user.enums.AppointmentCancelType;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.MappingSessionStatus;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * When admin suspends a PT: cancel future sessions, refund escrow, release holds, close mappings.
 */
@Service
@RequiredArgsConstructor
public class PtSuspendSettlementService {

    private final PtClientMappingRepository mappingRepository;
    private final PtMappingSessionRepository mappingSessionRepository;
    private final PtAppointmentRepository appointmentRepository;
    private final CoachingWalletService walletService;
    private final SlotHoldService slotHoldService;
    private final NotificationService notificationService;
    private final WebSocketSessionService webSocketSessionService;
    private final DietLogHelper dietLogHelper;

    @Transactional
    public void settleAllForSuspendedPt(UUID ptId) {
        List<PtClientMapping> activeish = mappingRepository.findAllByPt_IdAndStatusIn(
                ptId,
                List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED));
        for (PtClientMapping mapping : activeish) {
            settleActiveMapping(mapping);
        }

        List<PtClientMapping> pendingHire = mappingRepository.findAllByPt_IdAndStatusIn(
                ptId,
                List.of(ClientMappingStatus.PENDING, ClientMappingStatus.AWAITING_PAYMENT));
        for (PtClientMapping mapping : pendingHire) {
            closePendingHire(mapping);
        }
    }

    private void settleActiveMapping(PtClientMapping mapping) {
        cancelFutureSessionsAndRefundPerSession(mapping);
        walletService.refundRemainingIfPresent(
                mapping.getId(),
                "PT suspended — refund remaining coaching escrow");
        slotHoldService.releaseByMapping(mapping.getId());
        mapping.setStatus(ClientMappingStatus.INACTIVE);
        if (mapping.getCompletedAt() == null) {
            mapping.setCompletedAt(DietDates.nowVn());
        }
        mappingRepository.save(mapping);

        UUID clientId = mapping.getClient() != null ? mapping.getClient().getId() : null;
        if (clientId != null) {
            dietLogHelper.closePendingReviews(
                    clientId,
                    "Tự động đóng review do PT bị khóa / coaching dừng");
            notificationService.notify(clientId, NotificationPayload.builder()
                    .type("PT_SUSPENDED_REFUND")
                    .title("PT đã bị khóa — tiền đã hoàn")
                    .body("Buổi chưa dạy đã hủy. Phí còn lại đã về ví. Bạn có thể thuê PT khác trên marketplace.")
                    .linkType(NotificationLinkType.OTHER)
                    .linkRefId(mapping.getId())
                    .build());
        }
        emitMappingInactiveWs(mapping, "PT đã bị khóa. Quan hệ coaching của bạn đã được đóng.");
    }

    private void closePendingHire(PtClientMapping mapping) {
        slotHoldService.releaseByMapping(mapping.getId());
        walletService.refundRemainingIfPresent(
                mapping.getId(),
                "PT suspended — close unpaid hire / refund if any");
        mapping.setStatus(ClientMappingStatus.INACTIVE);
        if (mapping.getCompletedAt() == null) {
            mapping.setCompletedAt(DietDates.nowVn());
        }
        mapping.setAcceptedAt(null);
        mapping.setPaymentDueAt(null);
        mappingRepository.save(mapping);
        emitMappingInactiveWs(mapping, "PT bị khóa tài khoản. Yêu cầu coaching của bạn đã được đóng.");

        UUID clientId = mapping.getClient() != null ? mapping.getClient().getId() : null;
        if (clientId != null) {
            notificationService.notify(clientId, NotificationPayload.builder()
                    .type("PT_SUSPENDED_HIRE_CLOSED")
                    .title("Yêu cầu thuê PT đã hủy")
                    .body("PT bị khóa tài khoản. Yêu cầu coaching của bạn đã được đóng.")
                    .linkType(NotificationLinkType.OTHER)
                    .linkRefId(mapping.getId())
                    .build());
        }
    }

    private void emitMappingInactiveWs(PtClientMapping mapping, String message) {
        UUID clientId = mapping.getClient() != null ? mapping.getClient().getId() : null;
        UUID ptId = mapping.getPt() != null ? mapping.getPt().getId() : null;
        Map<String, Object> payload = new HashMap<>();
        payload.put("mappingId", mapping.getId());
        payload.put("ptId", ptId);
        payload.put("clientId", clientId);
        payload.put("message", message);
        if (clientId != null) {
            webSocketSessionService.sendToUser(clientId, "PT_SUSPENDED", payload);
        }
        if (ptId != null) {
            webSocketSessionService.sendToUser(ptId, "PT_SUSPENDED", payload);
        }
    }

    /**
     * Offline: cancel SCHEDULED future sessions + linked appointments (BY_ADMIN), refund per-session.
     * Unscheduled remaining is handled by refundRemainingIfPresent after this.
     */
    private void cancelFutureSessionsAndRefundPerSession(PtClientMapping mapping) {
        if (mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            return;
        }
        LocalDateTime now = DietDates.nowVn();
        List<PtMappingSession> scheduled = mappingSessionRepository.findByMappingIdAndStatusIn(
                mapping.getId(), List.of(MappingSessionStatus.SCHEDULED));
        List<PtAppointment> appointments = appointmentRepository.findByMappingId(mapping.getId());

        for (PtMappingSession session : scheduled) {
            if (session.getStartTime() == null || !session.getStartTime().isAfter(now)) {
                continue;
            }
            Optional<PtAppointment> apptOpt = appointments.stream()
                    .filter(a -> matchesSession(a, session))
                    .filter(a -> a.getStatus() == AppointmentStatus.PENDING
                            || a.getStatus() == AppointmentStatus.CONFIRMED)
                    .findFirst();

            if (apptOpt.isPresent()) {
                PtAppointment appt = apptOpt.get();
                appt.setStatus(AppointmentStatus.CANCELLED);
                appt.setCancelledBy("ADMIN");
                appt.setCancelType(AppointmentCancelType.BY_ADMIN);
                appt.setCancelReason("PT suspended by admin");
                appointmentRepository.save(appt);
            }

            session.setStatus(MappingSessionStatus.CANCELLED);
            mappingSessionRepository.save(session);

            BigDecimal perSession = mapping.getPerSessionAmount();
            if (perSession == null || perSession.signum() <= 0) {
                continue;
            }
            BigDecimal remaining = walletService.getRemainingEscrow(mapping.getId());
            if (remaining.signum() <= 0) {
                continue;
            }
            BigDecimal amount = perSession.min(remaining);
            walletService.refundToCustomer(
                    mapping.getId(),
                    amount,
                    "MAPPING_SESSION",
                    session.getId(),
                    "PT suspend — cancel unused offline session");
        }
    }

    private static boolean matchesSession(PtAppointment appt, PtMappingSession session) {
        if (appt.getMappingSessionId() != null) {
            return appt.getMappingSessionId().equals(session.getId());
        }
        return appt.getStartTime() != null
                && session.getStartTime() != null
                && appt.getStartTime().equals(session.getStartTime());
    }
}
