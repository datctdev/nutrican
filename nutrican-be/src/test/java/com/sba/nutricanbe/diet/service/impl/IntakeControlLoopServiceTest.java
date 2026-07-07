package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.IntakeDayStatus;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.IntakeStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.IntakeDayStatusRepository;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IntakeControlLoopServiceTest {

    @Mock private DietLogRepository dietLogRepository;
    @Mock private MacroTargetRepository macroTargetRepository;
    @Mock private IntakeDayStatusRepository intakeDayStatusRepository;
    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private UserRepository userRepository;
    @Mock private WebSocketSessionService webSocketSessionService;

    @InjectMocks
    private IntakeControlLoopServiceImpl service;

    private void stubTarget(UUID userId, int calories) {
        when(macroTargetRepository.findByUserId(userId)).thenReturn(Optional.of(MacroTarget.builder()
                .dailyCalories(BigDecimal.valueOf(calories))
                .build()));
    }

    private void stubLogs(UUID userId, LocalDate date, int calories) {
        when(dietLogRepository.findByCustomerIdAndLogDate(userId, date)).thenReturn(List.of(
                DietLog.builder()
                        .status(DietLogStatus.LOGGED)
                        .macrosJson(MacroNutrients.of(BigDecimal.valueOf(calories), null, null, null))
                        .build()
        ));
    }

    private void stubIntakeSave() {
        when(intakeDayStatusRepository.findByUserIdAndLogDate(any(), any(LocalDate.class)))
                .thenReturn(Optional.empty());
        when(intakeDayStatusRepository.save(any(IntakeDayStatus.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void flagsOverMacroWhenAbove120Percent() {
        UUID userId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        stubTarget(userId, 2000);
        stubLogs(userId, today, 2500);
        stubIntakeSave();
        when(mappingRepository.findFirstByClient_IdAndStatus(userId, ClientMappingStatus.ACTIVE))
                .thenReturn(Optional.empty());

        var result = service.evaluateAfterLog(userId, today, true);
        assertEquals(IntakeStatus.OVER_MACRO, result.getIntakeStatus());
        assertFalse(result.isSuggestSubmitToPt());
    }

    @Test
    void usesDefault2000WhenMacroTargetMissing() {
        UUID userId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        when(macroTargetRepository.findByUserId(userId)).thenReturn(Optional.empty());
        stubLogs(userId, today, 2500);
        stubIntakeSave();
        when(mappingRepository.findFirstByClient_IdAndStatus(userId, ClientMappingStatus.ACTIVE))
                .thenReturn(Optional.empty());

        var result = service.evaluateAfterLog(userId, today, true);
        assertEquals(IntakeStatus.OVER_MACRO, result.getIntakeStatus());
    }

    @Test
    void threeRiskyDaysBecomeAtRisk() {
        UUID userId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        stubTarget(userId, 2000);
        stubLogs(userId, today, 2500);
        when(intakeDayStatusRepository.findByUserIdAndLogDate(userId, today.minusDays(1)))
                .thenReturn(Optional.of(IntakeDayStatus.builder().status(IntakeStatus.OVER_MACRO).build()));
        when(intakeDayStatusRepository.findByUserIdAndLogDate(userId, today.minusDays(2)))
                .thenReturn(Optional.of(IntakeDayStatus.builder().status(IntakeStatus.UNDER_INTAKE).build()));
        when(intakeDayStatusRepository.findByUserIdAndLogDate(eq(userId), eq(today)))
                .thenReturn(Optional.empty());
        when(intakeDayStatusRepository.save(any(IntakeDayStatus.class))).thenAnswer(inv -> inv.getArgument(0));
        when(mappingRepository.findFirstByClient_IdAndStatus(userId, ClientMappingStatus.ACTIVE))
                .thenReturn(Optional.empty());

        var result = service.evaluateAfterLog(userId, today, true);
        assertEquals(IntakeStatus.AT_RISK, result.getIntakeStatus());
    }

    @Test
    void suggestSubmitToPtWhenPtMappedAndOverMacro() {
        UUID userId = UUID.randomUUID();
        UUID ptId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        stubTarget(userId, 2000);
        stubLogs(userId, today, 2500);
        stubIntakeSave();
        User pt = User.builder().fullName("PT").build();
        org.springframework.test.util.ReflectionTestUtils.setField(pt, "id", ptId);
        when(mappingRepository.findFirstByClient_IdAndStatus(userId, ClientMappingStatus.ACTIVE))
                .thenReturn(Optional.of(PtClientMapping.builder().pt(pt).client(User.builder().build()).build()));

        var result = service.evaluateAfterLog(userId, today, true);
        assertTrue(result.isSuggestSubmitToPt());
    }

    @Test
    void sendToPtFalseMeansNoSuggestSubmit() {
        UUID userId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        stubTarget(userId, 2000);
        stubLogs(userId, today, 2500);
        stubIntakeSave();
        User pt = User.builder().build();
        when(mappingRepository.findFirstByClient_IdAndStatus(userId, ClientMappingStatus.ACTIVE))
                .thenReturn(Optional.of(PtClientMapping.builder().pt(pt).build()));

        var result = service.evaluateAfterLog(userId, today, false);
        assertFalse(result.isSuggestSubmitToPt());
    }

    @Test
    void debouncePtAlertWithin24Hours() {
        UUID userId = UUID.randomUUID();
        UUID ptId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        stubTarget(userId, 2000);
        stubLogs(userId, today, 2500);
        IntakeDayStatus existing = IntakeDayStatus.builder()
                .userId(userId)
                .logDate(today)
                .ptAlertedAt(LocalDateTime.now().minusHours(2))
                .build();
        when(intakeDayStatusRepository.findByUserIdAndLogDate(userId, today)).thenReturn(Optional.of(existing));
        when(intakeDayStatusRepository.findByUserIdAndLogDate(userId, today.minusDays(1)))
                .thenReturn(Optional.of(IntakeDayStatus.builder().status(IntakeStatus.OVER_MACRO).build()));
        when(intakeDayStatusRepository.findByUserIdAndLogDate(userId, today.minusDays(2)))
                .thenReturn(Optional.of(IntakeDayStatus.builder().status(IntakeStatus.OVER_MACRO).build()));
        when(intakeDayStatusRepository.save(any(IntakeDayStatus.class))).thenAnswer(inv -> inv.getArgument(0));
        User pt = User.builder().build();
        org.springframework.test.util.ReflectionTestUtils.setField(pt, "id", ptId);
        when(mappingRepository.findFirstByClient_IdAndStatus(userId, ClientMappingStatus.ACTIVE))
                .thenReturn(Optional.of(PtClientMapping.builder().pt(pt).build()));

        var result = service.evaluateAfterLog(userId, today, true);
        assertEquals(IntakeStatus.AT_RISK, result.getIntakeStatus());
        assertFalse(result.isPtAlertSent());
        verify(webSocketSessionService, never()).sendToUser(any(), eq("PT_CLIENT_ALERT"), any());
    }

    private void stubAtRiskWithActivePt(UUID userId, UUID ptId, LocalDate today) {
        stubTarget(userId, 2000);
        stubLogs(userId, today, 2500);
        when(intakeDayStatusRepository.findByUserIdAndLogDate(userId, today.minusDays(1)))
                .thenReturn(Optional.of(IntakeDayStatus.builder().status(IntakeStatus.OVER_MACRO).build()));
        when(intakeDayStatusRepository.findByUserIdAndLogDate(userId, today.minusDays(2)))
                .thenReturn(Optional.of(IntakeDayStatus.builder().status(IntakeStatus.OVER_MACRO).build()));
        when(intakeDayStatusRepository.findByUserIdAndLogDate(eq(userId), eq(today)))
                .thenReturn(Optional.empty());
        when(intakeDayStatusRepository.save(any(IntakeDayStatus.class))).thenAnswer(inv -> inv.getArgument(0));
        User pt = User.builder().fullName("PT").build();
        org.springframework.test.util.ReflectionTestUtils.setField(pt, "id", ptId);
        when(mappingRepository.findFirstByClient_IdAndStatus(userId, ClientMappingStatus.ACTIVE))
                .thenReturn(Optional.of(PtClientMapping.builder().pt(pt).client(User.builder().build()).build()));
    }

    @Test
    void br17_noPtAlertWhenPendingReviewToday() {
        UUID userId = UUID.randomUUID();
        UUID ptId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        stubAtRiskWithActivePt(userId, ptId, today);
        when(dietLogRepository.existsByCustomerIdAndLogDateAndReviewStatus(
                userId, today, DietLogReviewStatus.PENDING)).thenReturn(true);

        var result = service.evaluateAfterLog(userId, today, true);
        assertEquals(IntakeStatus.AT_RISK, result.getIntakeStatus());
        assertFalse(result.isPtAlertSent());
        verify(webSocketSessionService, never()).sendToUser(any(), eq("PT_CLIENT_ALERT"), any());
    }

    @Test
    void br17_sendsPtAlertWhenNoPendingReview() {
        UUID userId = UUID.randomUUID();
        UUID ptId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        stubAtRiskWithActivePt(userId, ptId, today);
        when(dietLogRepository.existsByCustomerIdAndLogDateAndReviewStatus(
                userId, today, DietLogReviewStatus.PENDING)).thenReturn(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().fullName("Client").build()));

        var result = service.evaluateAfterLog(userId, today, true);
        assertEquals(IntakeStatus.AT_RISK, result.getIntakeStatus());
        assertTrue(result.isPtAlertSent());
        verify(webSocketSessionService).sendToUser(eq(ptId), eq("PT_CLIENT_ALERT"), any());
    }

    @Test
    void br17_pendingReviewSuppressesAlertAfterSubmit() {
        UUID userId = UUID.randomUUID();
        UUID ptId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        stubAtRiskWithActivePt(userId, ptId, today);
        when(dietLogRepository.existsByCustomerIdAndLogDateAndReviewStatus(
                userId, today, DietLogReviewStatus.PENDING)).thenReturn(true);

        var result = service.evaluateAfterLog(userId, today, false);
        assertEquals(IntakeStatus.AT_RISK, result.getIntakeStatus());
        assertFalse(result.isSuggestSubmitToPt());
        assertFalse(result.isPtAlertSent());
        verify(webSocketSessionService, never()).sendToUser(any(), eq("PT_CLIENT_ALERT"), any());
    }

    @Test
    void repositoryThrowReturnsOkWithoutBlocking() {
        UUID userId = UUID.randomUUID();
        when(macroTargetRepository.findByUserId(userId)).thenThrow(new RuntimeException("db down"));

        var result = service.evaluateAfterLog(userId, LocalDate.now(), true);
        assertEquals(IntakeStatus.OK, result.getIntakeStatus());
        assertNull(result.getControlLoopMessage());
    }
}
