package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.user.dto.ClientGoalDto;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.entity.ClientGoal;
import com.sba.nutricanbe.user.entity.ClientGoalMilestone;
import com.sba.nutricanbe.user.enums.MilestoneType;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.ClientGoalMilestoneRepository;
import com.sba.nutricanbe.user.repository.ClientGoalRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.service.ClientGoalService;
import com.sba.nutricanbe.user.service.ProgressTimelineService;
import com.sba.nutricanbe.workspace.dto.MilestoneDto;
import com.sba.nutricanbe.workspace.dto.ProgressDataDto;
import com.sba.nutricanbe.workspace.dto.RegressionAlertDto;
import com.sba.nutricanbe.workspace.dto.WeeklyAdherenceDto;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProgressTimelineServiceImpl implements ProgressTimelineService {

    private final ClientGoalRepository clientGoalRepository;
    private final ClientGoalMilestoneRepository milestoneRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final DietLogRepository dietLogRepository;
    private final ClientGoalService clientGoalService;
    private final PtClientMappingRepository mappingRepository;
    private final WebSocketSessionService webSocketSessionService;

    @Override
    public LocalDate computeProjectedCompletion(UUID userId, ClientGoalDto goals) {
        if (goals == null || goals.getTargetWeight() == null || goals.getBaselineWeight() == null) {
            return null;
        }
        List<BodyMetric> metrics = bodyMetricRepository.findByUserIdAndDateRange(
                userId, LocalDate.now().minusMonths(3), LocalDate.now());
        if (metrics.size() < 2) {
            return goals.getTargetDate();
        }
        BodyMetric first = metrics.get(0);
        BodyMetric last = metrics.get(metrics.size() - 1);
        if (first.getWeight() == null || last.getWeight() == null) {
            return goals.getTargetDate();
        }
        long days = ChronoUnit.DAYS.between(first.getRecordDate(), last.getRecordDate());
        if (days <= 0) {
            return goals.getTargetDate();
        }
        BigDecimal delta = last.getWeight().subtract(first.getWeight());
        BigDecimal remaining = goals.getTargetWeight().subtract(last.getWeight());
        if (delta.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }
        long daysNeeded = remaining.divide(delta, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(days))
                .longValue();
        if (daysNeeded < 0 || daysNeeded > 3650) {
            return null;
        }
        return last.getRecordDate().plusDays(daysNeeded);
    }

    @Override
    public RegressionAlertDto detectRegression(UUID userId) {
        ClientGoal goal = clientGoalRepository.findByUserId(userId).orElse(null);
        if (goal == null || goal.getNutritionGoal() != NutritionGoal.WEIGHT_LOSS) {
            return RegressionAlertDto.builder().active(false).build();
        }
        List<BodyMetric> recent = bodyMetricRepository.findByUserIdAndDateRange(
                userId, LocalDate.now().minusWeeks(4), LocalDate.now());
        if (recent.size() < 3) {
            return RegressionAlertDto.builder().active(false).build();
        }
        BodyMetric m1 = recent.get(recent.size() - 3);
        BodyMetric m2 = recent.get(recent.size() - 2);
        BodyMetric m3 = recent.get(recent.size() - 1);
        if (m1.getWeight() != null && m2.getWeight() != null && m3.getWeight() != null
                && m2.getWeight().subtract(m1.getWeight()).compareTo(BigDecimal.valueOf(0.5)) >= 0
                && m3.getWeight().subtract(m2.getWeight()).compareTo(BigDecimal.valueOf(0.5)) >= 0) {
            return RegressionAlertDto.builder()
                    .active(true)
                    .message("Cân nặng tăng 2 lần liên tiếp trong khi mục tiêu giảm cân.")
                    .build();
        }
        return RegressionAlertDto.builder().active(false).build();
    }

    @Override
    public List<WeeklyAdherenceDto> computeWeeklyAdherence(UUID userId, LocalDate start, LocalDate end) {
        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDateBetween(
                userId, start, end, org.springframework.data.domain.PageRequest.of(0, 500)).getContent();
        Map<LocalDate, Set<LocalDate>> weekLoggedDays = new HashMap<>();
        for (DietLog log : logs) {
            if (log.getStatus() != DietLogStatus.LOGGED || log.getLogDate() == null) {
                continue;
            }
            LocalDate weekStart = log.getLogDate().with(java.time.DayOfWeek.MONDAY);
            weekLoggedDays.computeIfAbsent(weekStart, k -> new HashSet<>()).add(log.getLogDate());
        }
        List<WeeklyAdherenceDto> result = new ArrayList<>();
        for (Map.Entry<LocalDate, Set<LocalDate>> e : weekLoggedDays.entrySet()) {
            int days = e.getValue().size();
            result.add(WeeklyAdherenceDto.builder()
                    .weekStart(e.getKey())
                    .loggedDays(days)
                    .adherenceRate(BigDecimal.valueOf(days * 100.0 / 7).setScale(1, RoundingMode.HALF_UP))
                    .build());
        }
        result.sort((a, b) -> a.getWeekStart().compareTo(b.getWeekStart()));
        return result;
    }

    @Override
    @Transactional
    public void evaluateAutoMilestones(UUID userId) {
        ClientGoal goal = clientGoalRepository.findByUserId(userId).orElse(null);
        if (goal == null || goal.getBaselineWeight() == null) {
            return;
        }
        bodyMetricRepository.findTopByUserIdOrderByRecordDateDesc(userId).ifPresent(latest -> {
            if (latest.getWeight() == null) {
                return;
            }
            BigDecimal lost = goal.getBaselineWeight().subtract(latest.getWeight());
            if (lost.compareTo(BigDecimal.ONE) >= 0) {
                addAutoIfNew(userId, "Giảm 1kg so với baseline");
            }
            if (lost.compareTo(BigDecimal.valueOf(5)) >= 0) {
                addAutoIfNew(userId, "Giảm 5kg so với baseline");
            }
        });
        List<WeeklyAdherenceDto> weeks = computeWeeklyAdherence(
                userId, LocalDate.now().minusWeeks(4), LocalDate.now());
        if (weeks.size() >= 4 && weeks.stream().allMatch(w ->
                w.getAdherenceRate() != null && w.getAdherenceRate().compareTo(BigDecimal.valueOf(80)) >= 0)) {
            addAutoIfNew(userId, "4 tuần liên tiếp adherence >80%");
        }
        RegressionAlertDto regression = detectRegression(userId);
        if (regression.isActive()) {
            notifyPtRegression(userId, regression.getMessage());
        }
    }

    private void addAutoIfNew(UUID userId, String title) {
        if (!milestoneRepository.existsByUserIdAndTitle(userId, title)) {
            milestoneRepository.save(ClientGoalMilestone.builder()
                    .userId(userId)
                    .milestoneType(MilestoneType.AUTO)
                    .title(title)
                    .achievedAt(LocalDateTime.now())
                    .build());
        }
    }

    private void notifyPtRegression(UUID userId, String message) {
        mappingRepository.findFirstByClient_IdAndStatusIn(
                        userId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))
                .ifPresent(mapping -> {
                    Map<String, Object> payload = new HashMap<>();
                    payload.put("clientId", userId.toString());
                    payload.put("intakeStatus", "WEIGHT_REGRESSION");
                    payload.put("reason", message);
                    webSocketSessionService.sendToUser(mapping.getPt().getId(), "PT_CLIENT_ALERT", payload);
                });
    }

    @Override
    public void enrichProgress(ProgressDataDto dto, UUID clientId, LocalDate start, LocalDate end) {
        ClientGoalDto goals = clientGoalService.getGoals(clientId);
        dto.setGoals(goals);
        dto.setProjectedCompletion(computeProjectedCompletion(clientId, goals));
        dto.setMilestones(listMilestones(clientId));
        dto.setRegressionAlert(detectRegression(clientId));
        dto.setWeeklyAdherence(computeWeeklyAdherence(clientId, start, end));
    }

    @Override
    public List<MilestoneDto> listMilestones(UUID userId) {
        return clientGoalService.listMilestones(userId);
    }
}
