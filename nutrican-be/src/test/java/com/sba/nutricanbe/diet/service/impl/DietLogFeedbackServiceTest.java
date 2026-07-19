package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.diet.dto.request.DietLogFeedbackRequest;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogFeedback;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.repository.DietLogFeedbackRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DietLogFeedbackServiceTest {

    @Mock private DietLogRepository dietLogRepository;
    @Mock private DietLogFeedbackRepository feedbackRepository;
    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private WebSocketSessionService webSocketSessionService;

    @InjectMocks
    private DietLogFeedbackServiceImpl feedbackService;

    @Test
    void saveFeedback_persistsRatings() {
        UUID customerId = UUID.randomUUID();
        UUID logId = UUID.randomUUID();
        DietLog log = DietLog.builder().customerId(customerId).status(DietLogStatus.LOGGED).build();
        ReflectionTestUtils.setField(log, "id", logId);
        when(dietLogRepository.findById(logId)).thenReturn(Optional.of(log));
        when(feedbackRepository.findByDietLogId(logId)).thenReturn(Optional.empty());
        when(feedbackRepository.save(any(DietLogFeedback.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dietLogRepository.findByCustomerIdOrderByCreatedAtDesc(any(), any())).thenReturn(List.of(log));

        DietLogFeedbackRequest req = new DietLogFeedbackRequest();
        req.setEnergyRating(4);
        req.setHungerAfterRating(2);
        req.setDigestionStatus("OK");

        DietLogFeedback saved = feedbackService.saveFeedback(customerId, logId, req);
        assertEquals(4, saved.getEnergyRating());
        assertEquals(2, saved.getHungerAfterRating());
    }

    @Test
    void saveFeedback_onDraftThrows() {
        UUID customerId = UUID.randomUUID();
        UUID logId = UUID.randomUUID();
        DietLog log = DietLog.builder().customerId(customerId).status(DietLogStatus.DRAFT).build();
        ReflectionTestUtils.setField(log, "id", logId);
        when(dietLogRepository.findById(logId)).thenReturn(Optional.of(log));

        assertThrows(BadRequestException.class, () ->
                feedbackService.saveFeedback(customerId, logId, new DietLogFeedbackRequest()));
    }

    @Test
    void threeLowEnergyAlertsPt() {
        UUID customerId = UUID.randomUUID();
        UUID ptId = UUID.randomUUID();
        UUID logId = UUID.randomUUID();
        DietLog log = DietLog.builder().customerId(customerId).status(DietLogStatus.LOGGED).build();
        ReflectionTestUtils.setField(log, "id", logId);
        when(dietLogRepository.findById(logId)).thenReturn(Optional.of(log));
        when(feedbackRepository.findByDietLogId(logId)).thenReturn(Optional.empty());
        when(feedbackRepository.save(any(DietLogFeedback.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        UUID id3 = UUID.randomUUID();
        DietLog l1 = DietLog.builder().customerId(customerId).status(DietLogStatus.LOGGED).build();
        DietLog l2 = DietLog.builder().customerId(customerId).status(DietLogStatus.LOGGED).build();
        DietLog l3 = DietLog.builder().customerId(customerId).status(DietLogStatus.LOGGED).build();
        ReflectionTestUtils.setField(l1, "id", id1);
        ReflectionTestUtils.setField(l2, "id", id2);
        ReflectionTestUtils.setField(l3, "id", id3);
        when(dietLogRepository.findByCustomerIdOrderByCreatedAtDesc(any(), any()))
                .thenReturn(List.of(l1, l2, l3));
        when(feedbackRepository.findByDietLogIdIn(anyList())).thenReturn(List.of(
                DietLogFeedback.builder().dietLogId(id1).energyRating(1).build(),
                DietLogFeedback.builder().dietLogId(id2).energyRating(1).build(),
                DietLogFeedback.builder().dietLogId(id3).energyRating(1).build()
        ));
        User pt = User.builder().build();
        ReflectionTestUtils.setField(pt, "id", ptId);
        when(mappingRepository.findFirstByClient_IdAndStatus(customerId, ClientMappingStatus.ACTIVE))
                .thenReturn(Optional.of(PtClientMapping.builder().pt(pt).build()));

        DietLogFeedbackRequest req = new DietLogFeedbackRequest();
        req.setEnergyRating(1);
        feedbackService.saveFeedback(customerId, logId, req);

        verify(webSocketSessionService).sendToUser(eq(ptId), eq("PT_CLIENT_ALERT"), any());
    }

    @Test
    void twoLowEnergyDoesNotAlert() {
        UUID customerId = UUID.randomUUID();
        UUID logId = UUID.randomUUID();
        DietLog log = DietLog.builder().customerId(customerId).status(DietLogStatus.LOGGED).build();
        ReflectionTestUtils.setField(log, "id", logId);
        when(dietLogRepository.findById(logId)).thenReturn(Optional.of(log));
        when(feedbackRepository.findByDietLogId(logId)).thenReturn(Optional.empty());
        when(feedbackRepository.save(any(DietLogFeedback.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        DietLog l1 = DietLog.builder().status(DietLogStatus.LOGGED).build();
        DietLog l2 = DietLog.builder().status(DietLogStatus.LOGGED).build();
        ReflectionTestUtils.setField(l1, "id", id1);
        ReflectionTestUtils.setField(l2, "id", id2);
        when(dietLogRepository.findByCustomerIdOrderByCreatedAtDesc(any(), any()))
                .thenReturn(List.of(l1, l2));

        feedbackService.saveFeedback(customerId, logId, new DietLogFeedbackRequest());
        verify(webSocketSessionService, never()).sendToUser(any(), any(), any());
    }
}
