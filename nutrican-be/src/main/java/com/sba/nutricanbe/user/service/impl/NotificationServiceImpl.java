package com.sba.nutricanbe.user.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.infrastructure.mail.MailService;
import com.sba.nutricanbe.user.dto.NotificationDto;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.entity.Notification;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.repository.NotificationRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private static final Set<String> NO_EMAIL_EVENTS = Set.of(
            "CHAT_MESSAGE", "NEW_DIET_LOG", "PT_CLIENT_ALERT", "NOTIFICATION_COUNT",
            "BODY_METRIC_REMINDER");

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final WebSocketSessionService webSocketSessionService;
    private final MailService mailService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void notify(UUID userId, NotificationPayload payload) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        Notification notification = Notification.builder()
                .user(user)
                .type(payload.getType())
                .title(payload.getTitle())
                .body(payload.getBody())
                .message(payload.getBody())
                .linkType(payload.getLinkType())
                .linkRefId(payload.getLinkRefId())
                .isRead(false)
                .build();
        notificationRepository.save(notification);
        pushUnreadCount(userId);
        if (payload.isSendEmail() && shouldEmail(user, payload.getType())) {
            mailService.sendNotificationEmail(user.getEmail(), user.getFullName(),
                    payload.getTitle(), payload.getBody(), payload.getEmailTemplate());
        }
    }

    @Override
    @Transactional
    public void recordFromWebSocketEvent(UUID userId, String event, Object data) {
        if ("NOTIFICATION_COUNT".equals(event)) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return;
        }
        String title = eventToTitle(event);
        String body = summarizeData(data);
        Notification notification = Notification.builder()
                .user(user)
                .type(event)
                .title(title)
                .body(body)
                .message(body)
                .linkType(eventToLinkType(event))
                .linkRefId(extractLinkRefId(data))
                .isRead(false)
                .build();
        notificationRepository.save(notification);
        pushUnreadCount(userId);
        if (!NO_EMAIL_EVENTS.contains(event) && shouldEmailForEvent(user, event)) {
            mailService.sendNotificationEmail(user.getEmail(), user.getFullName(), title, body, eventToTemplate(event));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<NotificationDto>> list(UUID userId, int page, int size, Boolean unreadOnly) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Notification> result = Boolean.TRUE.equals(unreadOnly)
                ? notificationRepository.findByUser_IdAndIsReadOrderByCreatedAtDesc(userId, false, pageable)
                : notificationRepository.findByUser_IdOrderByCreatedAtDesc(userId, pageable);
        return ApiResponse.success(PageResponse.from(result.map(NotificationDto::from)));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<Long> unreadCount(UUID userId) {
        return ApiResponse.success(notificationRepository.countByUser_IdAndIsRead(userId, false));
    }

    @Override
    @Transactional
    public ApiResponse<Void> markRead(UUID userId, UUID notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));
        if (!n.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Notification", notificationId);
        }
        n.setIsRead(true);
        notificationRepository.save(n);
        pushUnreadCount(userId);
        return ApiResponse.success(null, "Marked as read");
    }

    @Override
    @Transactional
    public ApiResponse<Void> markAllRead(UUID userId) {
        notificationRepository.markAllAsReadByUserId(userId);
        pushUnreadCount(userId);
        return ApiResponse.success(null, "All marked as read");
    }

    private void pushUnreadCount(UUID userId) {
        long count = notificationRepository.countByUser_IdAndIsRead(userId, false);
        webSocketSessionService.sendToUserOnly(userId, "NOTIFICATION_COUNT", Map.of("unreadCount", count));
    }

    private boolean shouldEmail(User user, String type) {
        return shouldEmailForEvent(user, type);
    }

    private boolean shouldEmailForEvent(User user, String event) {
        if (NO_EMAIL_EVENTS.contains(event)) {
            return false;
        }
        Map<String, Boolean> optIn = user.getNotificationOptIn();
        if (optIn == null) {
            return true;
        }
        return switch (event) {
            case "HIRE_RESULT", "HIRE_ACCEPTED", "HIRE_REJECTED" -> optIn.getOrDefault("hireResultEmail", true);
            case "REFUND_UPDATE" -> optIn.getOrDefault("refundEmail", true);
            case "SOS_RESOLVED", "SOS_ESCALATED" -> optIn.getOrDefault("sosResultEmail", true);
            case "WEEKLY_SUMMARY" -> optIn.getOrDefault("weeklySummaryEmail", true);
            default -> optIn.getOrDefault("email", true);
        };
    }

    private String eventToTitle(String event) {
        return switch (event) {
            case "NEW_DIET_LOG" -> "Nhật ký ăn mới";
            case "DIET_LOG_REVIEWED" -> "PT đã duyệt nhật ký";
            case "SOS" -> "SOS khẩn cấp";
            case "SOS_RESOLVED" -> "SOS đã xử lý";
            case "SOS_ESCALATED" -> "SOS quá hạn";
            case "HIRE_RESULT", "HIRE_ACCEPTED" -> "PT chấp nhận yêu cầu thuê";
            case "HIRE_REJECTED" -> "PT từ chối yêu cầu thuê";
            case "COACHING_END_REQUESTED" -> "Yêu cầu kết thúc coaching";
            case "REFUND_UPDATE" -> "Cập nhật hoàn tiền";
            case "WEEKLY_SUMMARY" -> "Tổng kết tuần";
            case "CHAT_MESSAGE" -> "Tin nhắn mới";
            case "PT_CLIENT_ALERT" -> "Cảnh báo client";
            case "BODY_METRIC_REMINDER" -> "Nhắc ghi cân nặng";
            default -> event;
        };
    }

    private NotificationLinkType eventToLinkType(String event) {
        return switch (event) {
            case "NEW_DIET_LOG", "DIET_LOG_REVIEWED" -> NotificationLinkType.DIET_LOG;
            case "CHAT_MESSAGE" -> NotificationLinkType.CHAT;
            case "SOS", "SOS_RESOLVED", "SOS_ESCALATED" -> NotificationLinkType.SOS;
            case "HIRE_RESULT", "HIRE_ACCEPTED", "HIRE_REJECTED" -> NotificationLinkType.HIRE;
            case "REFUND_UPDATE" -> NotificationLinkType.REFUND;
            case "COACHING_END_REQUESTED" -> NotificationLinkType.OTHER;
            case "BODY_METRIC_REMINDER" -> NotificationLinkType.OTHER;
            case "WEEKLY_SUMMARY" -> NotificationLinkType.WEEKLY_SUMMARY;
            default -> NotificationLinkType.OTHER;
        };
    }

    private String eventToTemplate(String event) {
        return switch (event) {
            case "HIRE_RESULT", "HIRE_ACCEPTED", "HIRE_REJECTED" -> "hire-result";
            case "REFUND_UPDATE" -> "refund-result";
            case "SOS_RESOLVED" -> "sos-resolved";
            case "WEEKLY_SUMMARY" -> "weekly-summary";
            default -> "generic-notification";
        };
    }

    private String summarizeData(Object data) {
        if (data == null) {
            return "";
        }
        if (data instanceof Map<?, ?> map) {
            Object message = map.get("message");
            if (message != null) {
                return String.valueOf(message);
            }
            Object resolutionNote = map.get("resolutionNote");
            if (resolutionNote != null) {
                return String.valueOf(resolutionNote);
            }
        }
        try {
            String json = objectMapper.writeValueAsString(data);
            return json.length() > 500 ? json.substring(0, 500) + "…" : json;
        } catch (Exception e) {
            return String.valueOf(data);
        }
    }

    private UUID extractLinkRefId(Object data) {
        if (!(data instanceof Map<?, ?> map)) {
            return null;
        }
        for (String key : List.of("dietLogId", "logId", "ticketId", "mappingId", "ptId", "clientId", "refundId")) {
            Object value = map.get(key);
            if (value instanceof UUID uuid) {
                return uuid;
            }
            if (value != null) {
                try {
                    return UUID.fromString(String.valueOf(value));
                } catch (IllegalArgumentException ignored) {
                    // try next key
                }
            }
        }
        return null;
    }
}
