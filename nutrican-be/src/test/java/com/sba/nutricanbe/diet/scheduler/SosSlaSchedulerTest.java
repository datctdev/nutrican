package com.sba.nutricanbe.diet.scheduler;

import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.infrastructure.mail.MailService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SosSlaSchedulerTest {

    @Mock private SosTicketRepository sosTicketRepository;
    @Mock private WebSocketSessionService webSocketSessionService;
    @Mock private UserRepository userRepository;
    @Mock private MailService mailService;
    @InjectMocks private SosSlaScheduler scheduler;

    @Test
    void checkSlaBreaches_marksTicketWhen24HoursFromAssignedAt() {
        SosTicket ticket = new SosTicket();
        ticket.setStatus(SosTicketStatus.ASSIGNED);
        ticket.setAssignedAt(LocalDateTime.now().minusHours(25));
        ticket.setPtId(UUID.randomUUID());
        ticket.setSlaBreached(false);
        ticket.setEscalationCount(0);

        when(sosTicketRepository.findByStatusIn(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(ticket)));
        when(userRepository.findByRole(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        scheduler.checkSlaBreaches();

        assertThat(ticket.getSlaBreached()).isTrue();
        assertThat(ticket.getEscalationCount()).isEqualTo(1);
        verify(sosTicketRepository).save(ticket);
    }

    @Test
    void checkSlaBreaches_usesAssignedAtNotCreatedAt() {
        SosTicket ticket = new SosTicket();
        ticket.setStatus(SosTicketStatus.ASSIGNED);
        ReflectionTestUtils.setField(ticket, "createdAt", LocalDateTime.now().minusHours(30));
        ticket.setAssignedAt(LocalDateTime.now().minusHours(2));
        ticket.setPtId(UUID.randomUUID());
        ticket.setSlaBreached(false);

        when(sosTicketRepository.findByStatusIn(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(ticket)));

        scheduler.checkSlaBreaches();

        assertThat(ticket.getSlaBreached()).isNotEqualTo(true);
        verify(sosTicketRepository, org.mockito.Mockito.never()).save(ticket);
    }

    @Test
    void checkSlaBreaches_sends4hReminderToPtInWindow() {
        UUID ptId = UUID.randomUUID();
        SosTicket ticket = new SosTicket();
        ticket.setStatus(SosTicketStatus.ASSIGNED);
        ticket.setAssignedAt(LocalDateTime.now().minusHours(4).minusMinutes(5));
        ticket.setPtId(ptId);
        ticket.setFirstResponseAt(null);

        User pt = User.builder().email("pt@test.com").fullName("PT").role(UserRole.PT_CERTIFIED).build();
        ReflectionTestUtils.setField(pt, "id", ptId);

        when(sosTicketRepository.findByStatusIn(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(ticket)));
        when(userRepository.findById(ptId)).thenReturn(java.util.Optional.of(pt));

        scheduler.checkSlaBreaches();

        verify(webSocketSessionService).sendToUser(eq(ptId), eq("SOS_SLA_REMINDER"), any());
        verify(mailService).sendNotificationEmail(eq("pt@test.com"), any(), any(), any(), any());
    }

    @Test
    void checkSlaBreaches_skips4hReminderWhenFirstResponseSet() {
        UUID ptId = UUID.randomUUID();
        SosTicket ticket = new SosTicket();
        ticket.setStatus(SosTicketStatus.ASSIGNED);
        ticket.setAssignedAt(LocalDateTime.now().minusHours(5));
        ticket.setPtId(ptId);
        ticket.setFirstResponseAt(LocalDateTime.now().minusHours(1));

        when(sosTicketRepository.findByStatusIn(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(ticket)));

        scheduler.checkSlaBreaches();

        verify(webSocketSessionService, never()).sendToUser(eq(ptId), eq("SOS_SLA_REMINDER"), any());
    }
}
