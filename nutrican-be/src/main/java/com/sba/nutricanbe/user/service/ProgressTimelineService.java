package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.ClientGoalDto;
import com.sba.nutricanbe.workspace.dto.MilestoneDto;
import com.sba.nutricanbe.workspace.dto.ProgressDataDto;
import com.sba.nutricanbe.workspace.dto.RegressionAlertDto;
import com.sba.nutricanbe.workspace.dto.WeeklyAdherenceDto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ProgressTimelineService {
    LocalDate computeProjectedCompletion(UUID userId, ClientGoalDto goals);
    RegressionAlertDto detectRegression(UUID userId);
    List<WeeklyAdherenceDto> computeWeeklyAdherence(UUID userId, LocalDate start, LocalDate end);
    void evaluateAutoMilestones(UUID userId);
    void enrichProgress(ProgressDataDto dto, UUID clientId, LocalDate start, LocalDate end);
    List<MilestoneDto> listMilestones(UUID userId);
}
