package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.diet.entity.SosTicket;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import com.sba.nutricanbe.workspace.service.impl.PtWorkspaceServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SosSlaServiceTest {

    @Mock private com.sba.nutricanbe.user.repository.PtClientMappingRepository mappingRepository;
    @Mock private com.sba.nutricanbe.diet.repository.DietLogRepository dietLogRepository;
    @Mock private com.sba.nutricanbe.user.repository.BodyMetricRepository bodyMetricRepository;
    @Mock private com.sba.nutricanbe.user.repository.UserRepository userRepository;
    @Mock private com.sba.nutricanbe.diet.repository.DietLogImageRepository dietLogImageRepository;
    @Mock private SosTicketRepository sosTicketRepository;
    @Mock private com.sba.nutricanbe.user.service.UserQueryService userQueryService;
    @Mock private WebSocketSessionService webSocketSessionService;
    @Mock private com.sba.nutricanbe.diet.repository.MealPlanRepository mealPlanRepository;
    @Mock private com.sba.nutricanbe.diet.repository.MealPlanItemRepository mealPlanItemRepository;
    @Mock private com.sba.nutricanbe.diet.repository.MealPlanSuggestionRepository mealPlanSuggestionRepository;
    @Mock private com.sba.nutricanbe.diet.repository.WeeklySummaryRepository weeklySummaryRepository;
    @Mock private com.sba.nutricanbe.diet.repository.DietLogFeedbackRepository dietLogFeedbackRepository;
    @Mock private com.sba.nutricanbe.user.service.ProgressTimelineService progressTimelineService;
    @Mock private com.sba.nutricanbe.user.service.UserProfileService userProfileService;
    @Mock private com.sba.nutricanbe.diet.service.IntakeControlLoopService intakeControlLoopService;
    @Mock private com.sba.nutricanbe.diet.service.DietLogService dietLogService;

    @InjectMocks private PtWorkspaceServiceImpl ptWorkspaceService;

    @Test
    void resolve_withoutResolutionNote_throws400() {
        UUID ticketId = UUID.randomUUID();
        UUID ptId = UUID.randomUUID();
        SosTicket ticket = SosTicket.builder().ptId(ptId).status(SosTicketStatus.ASSIGNED).build();
        when(sosTicketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

        assertThatThrownBy(() -> ptWorkspaceService.resolveSosTicket(ticketId, ptId, "short"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getClientProgress_inactiveMapping_throws403() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        PtClientMapping mapping = PtClientMapping.builder()
                .status(ClientMappingStatus.INACTIVE)
                .build();
        when(mappingRepository.findByPt_IdAndClient_Id(ptId, clientId)).thenReturn(Optional.of(mapping));

        assertThatThrownBy(() -> ptWorkspaceService.getClientProgress(ptId, clientId, LocalDate.now().minusDays(7), LocalDate.now()))
                .isInstanceOf(UnauthorizedException.class);
    }
}
