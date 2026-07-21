package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import com.sba.nutricanbe.workspace.service.impl.PtSosServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SosSlaServiceTest {

    @Mock private SosTicketRepository sosTicketRepository;
    @Mock private UserQueryService userQueryService;
    @Mock private WebSocketSessionService webSocketSessionService;

    @InjectMocks private PtSosServiceImpl ptSosService;

    @Test
    void resolve_withoutResolutionNote_throws400() {
        UUID ticketId = UUID.randomUUID();
        UUID ptId = UUID.randomUUID();
        SosTicket ticket = SosTicket.builder().ptId(ptId).status(SosTicketStatus.ASSIGNED).build();
        when(sosTicketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> ptSosService.resolveSosTicket(ticketId, ptId, "short"))
                .isInstanceOf(BadRequestException.class);
    }
}
