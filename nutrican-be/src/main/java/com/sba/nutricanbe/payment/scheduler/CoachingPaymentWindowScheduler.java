package com.sba.nutricanbe.payment.scheduler;

import com.sba.nutricanbe.payment.entity.Payment;
import com.sba.nutricanbe.payment.enums.CoachingPaymentStatus;
import com.sba.nutricanbe.payment.repository.CoachingPaymentRepository;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CoachingPaymentWindowScheduler {

    private final PtClientMappingRepository mappingRepository;
    private final CoachingPaymentRepository paymentRepository;
    private final WebSocketSessionService webSocketSessionService;

    @Scheduled(cron = "${app.payment.expiry-scan-cron:0 */15 * * * *}")
    @Transactional
    public void expireUnpaidAcceptedRequests() {
        List<PtClientMapping> expired = mappingRepository.findByStatusAndPaymentDueAtBefore(
                ClientMappingStatus.AWAITING_PAYMENT, LocalDateTime.now());
        for (PtClientMapping mapping : expired) {
            Optional<Payment> pendingPayment = paymentRepository
                    .findFirstByMapping_IdAndStatusOrderByCreatedAtDesc(
                            mapping.getId(), CoachingPaymentStatus.PENDING);
            boolean callbackStillExpected = pendingPayment
                    .map(payment -> payment.getExpiresAt().plusMinutes(5)
                            .isAfter(LocalDateTime.now()))
                    .orElse(false);
            if (callbackStillExpected) {
                continue;
            }
            pendingPayment.ifPresent(payment -> {
                payment.setStatus(CoachingPaymentStatus.CANCELLED);
                paymentRepository.save(payment);
            });
            mapping.setStatus(ClientMappingStatus.INACTIVE);
            mapping.setPaymentDueAt(null);
            mappingRepository.save(mapping);

            Map<String, Object> payload = new HashMap<>();
            payload.put("mappingId", mapping.getId());
            payload.put("ptId", mapping.getPt().getId());
            payload.put("clientId", mapping.getClient().getId());
            payload.put("message", "Yêu cầu coaching đã hết thời hạn thanh toán.");
            webSocketSessionService.sendToUser(
                    mapping.getClient().getId(), "HIRE_PAYMENT_EXPIRED", payload);
            webSocketSessionService.sendToUser(
                    mapping.getPt().getId(), "HIRE_PAYMENT_EXPIRED", payload);
        }
    }
}
