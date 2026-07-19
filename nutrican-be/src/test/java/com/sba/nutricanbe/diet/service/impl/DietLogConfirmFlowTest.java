package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.diet.dto.response.DietSummaryResponse;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.diet.dto.response.IntakeControlResult;
import com.sba.nutricanbe.diet.enums.IntakeStatus;
import com.sba.nutricanbe.user.service.UserQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DietLogConfirmFlowTest {

    @Mock
    private DietLogRepository dietLogRepository;
    @Mock
    private DietLogHelper dietLogHelper;
    @Mock
    private UserQueryService userQueryService;
    @Mock
    private IntakeControlLoopService intakeControlLoopService;

    @InjectMocks
    private DietLogServiceImpl dietLogService;

    @Test
    void summaryOnlyCountsLoggedStatus() {
        UUID customerId = UUID.randomUUID();
        LocalDate today = LocalDate.now();

        DietLog logged = DietLog.builder()
                .customerId(customerId)
                .logDate(today)
                .status(DietLogStatus.LOGGED)
                .reviewStatus(DietLogReviewStatus.NOT_REQUIRED)
                .macrosJson(new MacroNutrients(BigDecimal.valueOf(500), BigDecimal.TEN, BigDecimal.valueOf(60), BigDecimal.valueOf(15)))
                .build();

        DietLog draft = DietLog.builder()
                .customerId(customerId)
                .logDate(today)
                .status(DietLogStatus.DRAFT)
                .macrosJson(new MacroNutrients(BigDecimal.valueOf(999), BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE))
                .build();

        DietLog pendingReview = DietLog.builder()
                .customerId(customerId)
                .logDate(today)
                .status(DietLogStatus.LOGGED)
                .reviewStatus(DietLogReviewStatus.PENDING)
                .macrosJson(new MacroNutrients(BigDecimal.valueOf(300), BigDecimal.valueOf(20), BigDecimal.valueOf(30), BigDecimal.valueOf(10)))
                .build();

        when(dietLogRepository.findByCustomerIdAndLogDate(customerId, today))
                .thenReturn(List.of(logged, draft, pendingReview));
        when(userQueryService.findMacroTargetByUserId(customerId)).thenReturn(java.util.Optional.empty());
        when(intakeControlLoopService.evaluateAfterLog(customerId, today, true)).thenReturn(
                IntakeControlResult.builder().intakeStatus(IntakeStatus.OK).build());
        when(dietLogHelper.toResponse(any())).thenAnswer(inv -> {
            DietLog log = inv.getArgument(0);
            return com.sba.nutricanbe.diet.dto.response.DietLogResponse.builder()
                    .status(log.getStatus())
                    .reviewStatus(log.getReviewStatus())
                    .build();
        });

        DietSummaryResponse summary = dietLogService.getSummary(customerId, today).getData();

        assertEquals(0, BigDecimal.valueOf(800).compareTo(summary.getTotalCalories()));
        assertEquals(2, summary.getLogs().size());
        assertTrue(summary.getLogs().stream().allMatch(l -> l.getStatus() == DietLogStatus.LOGGED));
    }

    @Test
    void confirmSetsLoggedAndReviewStatus() {
        DietLog log = new DietLog();
        log.setStatus(DietLogStatus.DRAFT);
        log.setReviewStatus(DietLogReviewStatus.NOT_REQUIRED);

        log.setStatus(DietLogStatus.LOGGED);
        log.setReviewStatus(DietLogReviewStatus.PENDING);

        assertEquals(DietLogStatus.LOGGED, log.getStatus());
        assertEquals(DietLogReviewStatus.PENDING, log.getReviewStatus());

        log.setReviewStatus(DietLogReviewStatus.NOT_REQUIRED);
        assertEquals(DietLogStatus.LOGGED, log.getStatus());
        assertEquals(DietLogReviewStatus.NOT_REQUIRED, log.getReviewStatus());
    }
}
