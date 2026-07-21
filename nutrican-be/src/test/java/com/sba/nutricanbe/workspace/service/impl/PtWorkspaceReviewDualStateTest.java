package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.workspace.dto.ReviewActionRequest;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.repository.DietLogImageRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.SosTicketRepository;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PtWorkspaceReviewDualStateTest {

    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private DietLogRepository dietLogRepository;
    @Mock private BodyMetricRepository bodyMetricRepository;
    @Mock private UserRepository userRepository;
    @Mock private DietLogImageRepository dietLogImageRepository;
    @Mock private SosTicketRepository sosTicketRepository;
    @Mock private UserQueryService userQueryService;
    @Mock private WebSocketSessionService webSocketSessionService;

    @InjectMocks
    private PtDietLogReviewServiceImpl ptWorkspaceService;

    @Test
    void approveKeepsStatusLoggedAndSetsReviewApproved() {
        UUID logId = UUID.randomUUID();
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();

        DietLog dietLog = DietLog.builder()
                .customerId(clientId)
                .status(DietLogStatus.LOGGED)
                .reviewStatus(DietLogReviewStatus.PENDING)
                .build();

        User pt = new User();
        ReflectionTestUtils.setField(pt, "id", ptId);
        ReviewActionRequest request = new ReviewActionRequest();
        request.setAction("APPROVE");

        when(dietLogRepository.findByIdWithCustomer(logId)).thenReturn(Optional.of(dietLog));
        when(userRepository.findById(ptId)).thenReturn(Optional.of(pt));
        when(mappingRepository.existsByPt_IdAndClient_IdAndStatus(ptId, clientId, ClientMappingStatus.ACTIVE))
                .thenReturn(true);
        when(dietLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ptWorkspaceService.reviewLog(logId, ptId, request);

        assertEquals(DietLogStatus.LOGGED, dietLog.getStatus());
        assertEquals(DietLogReviewStatus.APPROVED, dietLog.getReviewStatus());
    }
}
