package com.sba.nutricanbe.payment.scheduler;

import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class OnlineCoachingSettleScheduler {

    private final PtClientMappingRepository mappingRepository;
    private final CoachingWalletService walletService;
    private final WebSocketSessionService webSocketSessionService;

    @Scheduled(cron = "${app.payment.online-settle-cron:0 0 * * * *}")
    @Transactional
    public void settleExpiredOnlineCoaching() {
        LocalDateTime now = DietDates.nowVn();
        List<PtClientMapping> due = mappingRepository
                .findBySelectedTrainingModeAndStatusAndPeriodEndsAtBefore(
                        TrainingMode.ONLINE, ClientMappingStatus.ACTIVE, now);
        for (PtClientMapping mapping : due) {
            BigDecimal remaining = walletService.getRemainingEscrow(mapping.getId());
            if (remaining.signum() <= 0) {
                continue;
            }
            walletService.releaseToPt(
                    mapping.getId(),
                    remaining,
                    "COACHING_ESCROW",
                    mapping.getId(),
                    "Online period ended — settle remaining to PT");

            mapping.setStatus(ClientMappingStatus.COMPLETED);
            mapping.setCompletedAt(now);
            mappingRepository.save(mapping);

            Map<String, Object> payload = new HashMap<>();
            payload.put("mappingId", mapping.getId());
            payload.put("message", "Gói coaching online đã hết hạn và tiền escrow đã được quyết toán cho PT.");
            webSocketSessionService.sendToUser(mapping.getClient().getId(), "COACHING_COMPLETED", payload);
            webSocketSessionService.sendToUser(mapping.getPt().getId(), "COACHING_COMPLETED", payload);
            log.info("Settled online coaching mapping {}", mapping.getId());
        }
    }
}
