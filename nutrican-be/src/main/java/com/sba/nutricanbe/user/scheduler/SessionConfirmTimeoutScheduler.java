package com.sba.nutricanbe.user.scheduler;

import com.sba.nutricanbe.user.service.MappingSessionConfirmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SessionConfirmTimeoutScheduler {

    private final MappingSessionConfirmService confirmService;

    @Scheduled(cron = "${app.session.confirm-scan-cron:0 */10 * * * *}")
    public void autoConfirmOverdue() {
        int count = confirmService.autoConfirmOverdueSessions();
        if (count > 0) {
            log.info("Auto-confirmed {} overdue mapping sessions", count);
        }
    }
}
