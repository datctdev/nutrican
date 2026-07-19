package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.response.IntakeControlResult;
import com.sba.nutricanbe.workspace.dto.PtClientAlertDto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface IntakeControlLoopService {

    IntakeControlResult evaluateAfterLog(UUID customerId, LocalDate logDate, boolean reviewNotRequired);

    List<PtClientAlertDto> getActiveAlertsForPt(UUID ptId);
}
