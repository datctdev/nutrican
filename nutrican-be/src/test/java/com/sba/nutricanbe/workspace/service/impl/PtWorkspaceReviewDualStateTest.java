package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ForbiddenException;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import com.sba.nutricanbe.diet.enums.PtReviewAction;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.workspace.dto.ReviewActionRequest;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PtWorkspaceReviewDualStateTest {

    private static final LocalDate DAY = LocalDate.of(2026, 7, 20);

    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private DietLogRepository dietLogRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserQueryService userQueryService;
    @Mock private StorageService storageService;
    @Mock private WebSocketSessionService webSocketSessionService;
    @Mock private IntakeControlLoopService intakeControlLoopService;

    @InjectMocks
    private PtDietLogReviewServiceImpl ptWorkspaceService;

    private final UUID logId = UUID.randomUUID();
    private final UUID ptId = UUID.randomUUID();
    private final UUID clientId = UUID.randomUUID();

    private DietLog givenPendingLog() {
        DietLog dietLog = DietLog.builder()
                .customerId(clientId)
                .logDate(DAY)
                .status(DietLogStatus.LOGGED)
                .reviewStatus(DietLogReviewStatus.PENDING)
                .foodDescription("Cơm gà (AI đoán)")
                .macrosJson(MacroNutrients.of(
                        BigDecimal.valueOf(500), BigDecimal.valueOf(30),
                        BigDecimal.valueOf(50), BigDecimal.valueOf(15)))
                .build();

        User pt = new User();
        ReflectionTestUtils.setField(pt, "id", ptId);
        when(dietLogRepository.findByIdWithCustomer(logId)).thenReturn(Optional.of(dietLog));
        when(userRepository.findById(ptId)).thenReturn(Optional.of(pt));
        when(mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(eq(ptId), eq(clientId), anyList()))
                .thenReturn(true);
        when(dietLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        return dietLog;
    }

    private static ReviewActionRequest adjustRequest(String action) {
        ReviewActionRequest request = new ReviewActionRequest();
        request.setAction(action);
        request.setAdjustedFoodDescription("Cơm gà xối mỡ");
        request.setAdjustedCalories(BigDecimal.valueOf(750));
        request.setAdjustedProtein(BigDecimal.valueOf(35));
        request.setAdjustedCarb(BigDecimal.valueOf(80));
        request.setAdjustedFat(BigDecimal.valueOf(25));
        request.setCorrectionReason(PtCorrectionReason.WRONG_PORTION);
        return request;
    }

    @Test
    void approveKeepsStatusLoggedAndSetsReviewApproved() {
        DietLog dietLog = givenPendingLog();
        ReviewActionRequest request = new ReviewActionRequest();
        request.setAction("APPROVE");

        ptWorkspaceService.reviewLog(logId, ptId, request);

        assertEquals(DietLogStatus.LOGGED, dietLog.getStatus());
        assertEquals(DietLogReviewStatus.APPROVED, dietLog.getReviewStatus());
        assertEquals(PtReviewAction.APPROVE, dietLog.getPtAction());
        assertEquals(0, dietLog.getMacrosJson().calories().compareTo(BigDecimal.valueOf(500)));
        assertNull(dietLog.getPtCorrectionReason());
    }

    @Test
    void adjustReplacesMacrosAndFoodNameThenApproves() {
        DietLog dietLog = givenPendingLog();

        ptWorkspaceService.reviewLog(logId, ptId, adjustRequest("ADJUST_MACROS"));

        assertEquals(DietLogReviewStatus.APPROVED, dietLog.getReviewStatus());
        assertEquals(PtReviewAction.ADJUST, dietLog.getPtAction());
        assertEquals(PtCorrectionReason.WRONG_PORTION, dietLog.getPtCorrectionReason());
        assertEquals("Cơm gà xối mỡ", dietLog.getFoodDescription());
        assertEquals(0, dietLog.getMacrosJson().calories().compareTo(BigDecimal.valueOf(750)));
        assertEquals(0, dietLog.getMacrosAtReview().calories().compareTo(BigDecimal.valueOf(500)));
        verify(intakeControlLoopService).evaluateAfterLog(clientId, DAY, true);
    }

    @Test
    void legacyRejectWithCorrectedDataBecomesAdjust() {
        DietLog dietLog = givenPendingLog();

        ptWorkspaceService.reviewLog(logId, ptId, adjustRequest("REJECT"));

        assertEquals(DietLogReviewStatus.APPROVED, dietLog.getReviewStatus());
        assertEquals(PtReviewAction.ADJUST, dietLog.getPtAction());
    }

    @Test
    void rejectWithoutCorrectedDataIsBlockedAndKeepsPending() {
        DietLog dietLog = givenPendingLog();
        ReviewActionRequest request = new ReviewActionRequest();
        request.setAction("REJECT");
        request.setNote("Ảnh không rõ");

        assertThrows(BadRequestException.class, () -> ptWorkspaceService.reviewLog(logId, ptId, request));

        assertEquals(DietLogReviewStatus.PENDING, dietLog.getReviewStatus());
        assertEquals(0, dietLog.getMacrosJson().calories().compareTo(BigDecimal.valueOf(500)));
        verify(dietLogRepository, never()).save(any());
    }

    @Test
    void adjustWithoutAnyChangeIsBlocked() {
        DietLog dietLog = givenPendingLog();
        ReviewActionRequest request = new ReviewActionRequest();
        request.setAction("ADJUST_MACROS");
        request.setAdjustedFoodDescription(dietLog.getFoodDescription());
        request.setAdjustedCalories(BigDecimal.valueOf(500));
        request.setAdjustedProtein(BigDecimal.valueOf(30));
        request.setAdjustedCarb(BigDecimal.valueOf(50));
        request.setAdjustedFat(BigDecimal.valueOf(15));

        assertThrows(BadRequestException.class, () -> ptWorkspaceService.reviewLog(logId, ptId, request));
        assertEquals(DietLogReviewStatus.PENDING, dietLog.getReviewStatus());
    }

    @Test
    void adjustWithInvalidMacrosIsBlocked() {
        givenPendingLog();
        ReviewActionRequest zeroCalories = adjustRequest("ADJUST_MACROS");
        zeroCalories.setAdjustedCalories(BigDecimal.ZERO);
        assertThrows(BadRequestException.class, () -> ptWorkspaceService.reviewLog(logId, ptId, zeroCalories));

        ReviewActionRequest negativeProtein = adjustRequest("ADJUST_MACROS");
        negativeProtein.setAdjustedProtein(BigDecimal.valueOf(-1));
        assertThrows(BadRequestException.class, () -> ptWorkspaceService.reviewLog(logId, ptId, negativeProtein));

        ReviewActionRequest missingFat = adjustRequest("ADJUST_MACROS");
        missingFat.setAdjustedFat(null);
        assertThrows(BadRequestException.class, () -> ptWorkspaceService.reviewLog(logId, ptId, missingFat));

        verify(dietLogRepository, never()).save(any());
    }

    @Test
    void notifiesClientWithStatusAndAction() {
        givenPendingLog();

        ptWorkspaceService.reviewLog(logId, ptId, adjustRequest("ADJUST_MACROS"));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> payload = ArgumentCaptor.forClass(Map.class);
        verify(webSocketSessionService).sendToUser(eq(clientId), eq("DIET_LOG_REVIEWED"), payload.capture());
        assertEquals("APPROVED", payload.getValue().get("status"));
        assertEquals("ADJUST", payload.getValue().get("action"));
    }

    @Test
    void reviewIsBlockedForLogOfAnotherPt() {
        givenPendingLog();
        when(mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(eq(ptId), eq(clientId), anyList()))
                .thenReturn(false);

        assertThrows(ForbiddenException.class,
                () -> ptWorkspaceService.reviewLog(logId, ptId, adjustRequest("ADJUST_MACROS")));
    }

    @Test
    void adjustWithBlankFoodNameIsBlocked() {
        DietLog dietLog = givenPendingLog();
        ReviewActionRequest request = adjustRequest("ADJUST_MACROS");
        request.setAdjustedFoodDescription("   ");

        assertThrows(BadRequestException.class, () -> ptWorkspaceService.reviewLog(logId, ptId, request));
        assertEquals(DietLogReviewStatus.PENDING, dietLog.getReviewStatus());
        verify(dietLogRepository, never()).save(any());
    }

    @Test
    void adjustWithMacroOverLimitIsBlocked() {
        givenPendingLog();
        ReviewActionRequest request = adjustRequest("ADJUST_MACROS");
        request.setAdjustedCalories(BigDecimal.valueOf(20001));

        assertThrows(BadRequestException.class, () -> ptWorkspaceService.reviewLog(logId, ptId, request));
        verify(dietLogRepository, never()).save(any());
    }

    @Test
    void approveWithoutAdjustedMacrosStillSucceeds() {
        DietLog dietLog = givenPendingLog();
        ReviewActionRequest request = new ReviewActionRequest();
        request.setAction("APPROVE");
        request.setNote("Duyệt nhanh từ chat");

        ptWorkspaceService.reviewLog(logId, ptId, request);

        assertEquals(DietLogReviewStatus.APPROVED, dietLog.getReviewStatus());
        assertEquals(PtReviewAction.APPROVE, dietLog.getPtAction());
        assertEquals(0, dietLog.getMacrosJson().calories().compareTo(BigDecimal.valueOf(500)));
    }

    @Test
    void reviewIsBlockedWhenLogNoLongerPending() {
        DietLog dietLog = givenPendingLog();
        dietLog.setReviewStatus(DietLogReviewStatus.APPROVED);

        assertThrows(BadRequestException.class,
                () -> ptWorkspaceService.reviewLog(logId, ptId, adjustRequest("ADJUST_MACROS")));
    }
}
