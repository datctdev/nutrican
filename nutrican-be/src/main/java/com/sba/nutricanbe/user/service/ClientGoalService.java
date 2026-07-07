package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.ClientGoalDto;
import com.sba.nutricanbe.user.dto.ClientGoalRequest;
import com.sba.nutricanbe.workspace.dto.MilestoneDto;

import java.util.List;
import java.util.UUID;

public interface ClientGoalService {
    ClientGoalDto getGoals(UUID userId);
    ClientGoalDto saveGoals(UUID userId, ClientGoalRequest request);
    List<MilestoneDto> listMilestones(UUID userId);
    MilestoneDto addManualMilestone(UUID userId, String title, String note);
}
