package com.sba.nutricanbe.user.scheduler;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.BodyMetricService;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class BodyMetricReminderScheduler {

    private final UserRepository userRepository;
    private final BodyMetricService bodyMetricService;
    private final WebSocketSessionService webSocketSessionService;
    private final NotificationService notificationService;

    private static final String REMINDER_MESSAGE =
            "Bạn chưa ghi cân nặng hơn 7 ngày. Hãy cập nhật để theo dõi tiến độ chính xác.";

    @Scheduled(cron = "0 0 8 * * *")
    public void sendWeeklyReminders() {
        userRepository.findByRole(UserRole.CUSTOMER, Pageable.unpaged()).forEach(user -> {
            try {
                if (!bodyMetricService.shouldRemind(user)) {
                    return;
                }
                Map<String, Object> payload = new HashMap<>();
                payload.put("message", REMINDER_MESSAGE);
                webSocketSessionService.sendToUser(user.getId(), "BODY_METRIC_REMINDER", payload);
                notificationService.notify(user.getId(), NotificationPayload.builder()
                        .type("BODY_METRIC_REMINDER")
                        .title("Nhắc ghi cân nặng")
                        .body(REMINDER_MESSAGE)
                        .sendEmail(false)
                        .build());
            } catch (Exception e) {
                log.warn("Body metric reminder failed for user {}", user.getId());
            }
        });
    }
}
