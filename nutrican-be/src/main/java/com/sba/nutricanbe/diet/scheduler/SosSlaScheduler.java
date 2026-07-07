package com.sba.nutricanbe.diet.scheduler;

import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.infrastructure.mail.MailService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class SosSlaScheduler {

    private final SosTicketRepository sosTicketRepository;
    private final WebSocketSessionService webSocketSessionService;
    private final UserRepository userRepository;
    private final MailService mailService;

    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void checkSlaBreaches() {
        LocalDateTime now = LocalDateTime.now();
        List<SosTicket> openTickets = sosTicketRepository.findByStatusIn(
                List.of(SosTicketStatus.OPEN, SosTicketStatus.ASSIGNED, SosTicketStatus.IN_PROGRESS),
                org.springframework.data.domain.Pageable.unpaged()).getContent();

        for (SosTicket ticket : openTickets) {
            LocalDateTime slaBase = ticket.getAssignedAt() != null ? ticket.getAssignedAt() : ticket.getCreatedAt();
            if (slaBase == null) {
                continue;
            }

            if (ticket.getFirstResponseAt() == null && slaBase.plusHours(4).isBefore(now)) {
                boolean inFirstWindow = slaBase.plusHours(4).plusMinutes(15).isAfter(now);
                if (inFirstWindow && ticket.getPtId() != null) {
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("ticketId", ticket.getId());
                    payload.put("message", "SOS chưa có phản hồi sau 4 giờ");
                    webSocketSessionService.sendToUser(ticket.getPtId(), "SOS_SLA_REMINDER", payload);
                    userRepository.findById(ticket.getPtId()).ifPresent(this::emailPtSlaReminder);
                }
            }

            if (ticket.getResolvedAt() == null && slaBase.plusHours(24).isBefore(now)
                    && !Boolean.TRUE.equals(ticket.getSlaBreached())) {
                ticket.setSlaBreached(true);
                ticket.setEscalationCount((ticket.getEscalationCount() != null ? ticket.getEscalationCount() : 0) + 1);
                sosTicketRepository.save(ticket);
                userRepository.findByRole(com.sba.nutricanbe.common.enums.UserRole.ADMIN,
                        org.springframework.data.domain.Pageable.unpaged()).forEach(admin -> {
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("ticketId", ticket.getId());
                    payload.put("message", "SOS quá hạn 24 giờ");
                    webSocketSessionService.sendToUser(admin.getId(), "SOS_ESCALATED", payload);
                });
            }
        }
    }

    private void emailPtSlaReminder(User pt) {
        try {
            mailService.sendNotificationEmail(
                    pt.getEmail(),
                    pt.getFullName(),
                    "SOS chưa phản hồi sau 4 giờ",
                    "Bạn có ticket SOS cần phản hồi trong vòng 4 giờ kể từ khi được phân công.",
                    "sos-resolved");
        } catch (Exception e) {
            log.warn("Failed SOS SLA reminder email to PT {}", pt.getId());
        }
    }
}
