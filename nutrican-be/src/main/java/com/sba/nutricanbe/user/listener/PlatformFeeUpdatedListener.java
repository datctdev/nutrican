package com.sba.nutricanbe.user.listener;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.event.PlatformFeeUpdatedEvent;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class PlatformFeeUpdatedListener {

    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final WebSocketSessionService webSocketSessionService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void notifyActivePts(PlatformFeeUpdatedEvent event) {
        List<User> activePts = userRepository.findByRoleInAndStatus(
                List.of(UserRole.PT_CERTIFIED, UserRole.PT_FREELANCE),
                UserStatus.ACTIVE);

        String previous = formatRate(event.previousRate());
        String current = formatRate(event.newRate());
        String body = event.previousRate() != null
                ? "Phí hoa hồng nền tảng đã thay đổi từ " + previous + "% thành " + current
                    + "%. Mức mới áp dụng cho các hợp đồng được tạo sau thời điểm cập nhật."
                : "Phí hoa hồng nền tảng được thiết lập ở mức " + current
                    + "%. Mức này áp dụng cho các hợp đồng mới.";

        NotificationPayload notification = NotificationPayload.builder()
                .type("PLATFORM_FEE_UPDATED")
                .title("Cập nhật phí hoa hồng")
                .body(body)
                .linkType(NotificationLinkType.OTHER)
                .sendEmail(false)
                .build();

        Map<String, Object> realtimePayload = Map.of(
                "previousRate", previous,
                "newRate", current,
                "message", body);

        for (User pt : activePts) {
            try {
                notificationService.notify(pt.getId(), notification);
                webSocketSessionService.sendToUserOnly(
                        pt.getId(), "PLATFORM_FEE_UPDATED", realtimePayload);
            } catch (RuntimeException exception) {
                log.warn("Không thể gửi thông báo thay đổi hoa hồng tới PT {}", pt.getId(), exception);
            }
        }
    }

    private String formatRate(BigDecimal rate) {
        return rate == null ? "" : rate.stripTrailingZeros().toPlainString();
    }
}
