package com.sba.nutricanbe.admin.service.impl;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SosAdminServiceTest {

    @Mock private SosTicketRepository sosTicketRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserQueryService userQueryService;
    @InjectMocks private SosAdminServiceImpl service;

    @Test
    void assignSosTicket_reassignsWhenSlaBreached() {
        UUID ticketId = UUID.randomUUID();
        UUID newPtId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        SosTicket ticket = new SosTicket();
        ticket.setStatus(SosTicketStatus.ASSIGNED);
        ticket.setSlaBreached(true);
        ticket.setEscalationCount(1);
        ReflectionTestUtils.setField(ticket, "id", ticketId);

        User pt = User.builder().role(UserRole.PT_CERTIFIED).build();
        User admin = User.builder().role(UserRole.ADMIN).build();

        when(sosTicketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
        when(userRepository.findById(newPtId)).thenReturn(Optional.of(pt));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(sosTicketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.assignSosTicket(ticketId, newPtId, adminId);

        assertThat(ticket.getSlaBreached()).isFalse();
        assertThat(ticket.getEscalationCount()).isEqualTo(2);
        assertThat(ticket.getPtId()).isEqualTo(newPtId);
        verify(sosTicketRepository).save(ticket);
    }

    @Test
    void assignSosTicket_rejectsWhenAssignedWithoutSlaBreach() {
        UUID ticketId = UUID.randomUUID();
        SosTicket ticket = new SosTicket();
        ticket.setStatus(SosTicketStatus.ASSIGNED);
        ticket.setSlaBreached(false);
        when(sosTicketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> service.assignSosTicket(ticketId, UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(BadRequestException.class);
    }
}
