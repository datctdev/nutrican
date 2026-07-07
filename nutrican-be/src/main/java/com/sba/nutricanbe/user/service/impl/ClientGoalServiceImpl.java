package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.user.dto.ClientGoalDto;
import com.sba.nutricanbe.user.dto.ClientGoalRequest;
import com.sba.nutricanbe.user.entity.ClientGoal;
import com.sba.nutricanbe.user.entity.ClientGoalMilestone;
import com.sba.nutricanbe.user.enums.MilestoneType;
import com.sba.nutricanbe.user.repository.ClientGoalMilestoneRepository;
import com.sba.nutricanbe.user.repository.ClientGoalRepository;
import com.sba.nutricanbe.user.service.ClientGoalService;
import com.sba.nutricanbe.workspace.dto.MilestoneDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClientGoalServiceImpl implements ClientGoalService {

    private final ClientGoalRepository clientGoalRepository;
    private final ClientGoalMilestoneRepository milestoneRepository;

    @Override
    @Transactional(readOnly = true)
    public ClientGoalDto getGoals(UUID userId) {
        return clientGoalRepository.findByUserId(userId).map(this::toDto).orElse(null);
    }

    @Override
    @Transactional
    public ClientGoalDto saveGoals(UUID userId, ClientGoalRequest request) {
        ClientGoal goal = clientGoalRepository.findByUserId(userId)
                .orElse(ClientGoal.builder().userId(userId).build());
        if (request.getNutritionGoal() != null) goal.setNutritionGoal(request.getNutritionGoal());
        if (request.getTargetWeight() != null) goal.setTargetWeight(request.getTargetWeight());
        if (request.getBaselineWeight() != null) goal.setBaselineWeight(request.getBaselineWeight());
        if (request.getTargetDate() != null) goal.setTargetDate(request.getTargetDate());
        if (request.getTrimester() != null) goal.setTrimester(request.getTrimester());
        return toDto(clientGoalRepository.save(goal));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MilestoneDto> listMilestones(UUID userId) {
        return milestoneRepository.findByUserIdOrderByAchievedAtDesc(userId).stream()
                .map(this::toMilestoneDto)
                .toList();
    }

    @Override
    @Transactional
    public MilestoneDto addManualMilestone(UUID userId, String title, String note) {
        ClientGoalMilestone m = milestoneRepository.save(ClientGoalMilestone.builder()
                .userId(userId)
                .milestoneType(MilestoneType.MANUAL)
                .title(title)
                .note(note)
                .achievedAt(LocalDateTime.now())
                .build());
        return toMilestoneDto(m);
    }

    private ClientGoalDto toDto(ClientGoal g) {
        return ClientGoalDto.builder()
                .nutritionGoal(g.getNutritionGoal())
                .targetWeight(g.getTargetWeight())
                .baselineWeight(g.getBaselineWeight())
                .targetDate(g.getTargetDate())
                .trimester(g.getTrimester())
                .build();
    }

    private MilestoneDto toMilestoneDto(ClientGoalMilestone m) {
        return MilestoneDto.builder()
                .id(m.getId())
                .milestoneType(m.getMilestoneType())
                .title(m.getTitle())
                .achievedAt(m.getAchievedAt())
                .note(m.getNote())
                .build();
    }
}
