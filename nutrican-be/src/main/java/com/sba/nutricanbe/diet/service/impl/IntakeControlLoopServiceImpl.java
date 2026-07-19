package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.diet.dto.response.IntakeControlResult;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.IntakeDayStatus;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.IntakeStatus;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.repository.IntakeDayStatusRepository;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.workspace.dto.PtClientAlertDto;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntakeControlLoopServiceImpl implements IntakeControlLoopService {

    private final DietLogRepository dietLogRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final IntakeDayStatusRepository intakeDayStatusRepository;
    private final PtClientMappingRepository mappingRepository;
    private final UserRepository userRepository;
    private final WebSocketSessionService webSocketSessionService;

    @Override
    @Transactional
    public IntakeControlResult evaluateAfterLog(UUID customerId, LocalDate logDate, boolean reviewNotRequired) {
        try {
            LocalDate date = logDate != null ? logDate : LocalDate.now();
            BigDecimal totalCalories = sumLoggedCalories(customerId, date);
            BigDecimal targetCalories = resolveTargetCalories(customerId);

            IntakeStatus dayStatus = IntakeStatus.OK;
            if (totalCalories.compareTo(targetCalories.multiply(BigDecimal.valueOf(1.2))) > 0) {
                dayStatus = IntakeStatus.OVER_MACRO;
            } else if (LocalTime.now().getHour() >= 18
                    && totalCalories.compareTo(targetCalories.multiply(BigDecimal.valueOf(0.5))) < 0) {
                dayStatus = IntakeStatus.UNDER_INTAKE;
            }

            int consecutive = computeConsecutiveAtRisk(customerId, date, dayStatus);
            if (consecutive >= 3) {
                dayStatus = IntakeStatus.AT_RISK;
            }

            IntakeDayStatus record = intakeDayStatusRepository.findByUserIdAndLogDate(customerId, date)
                    .orElse(IntakeDayStatus.builder().userId(customerId).logDate(date).build());
            record.setStatus(dayStatus);
            record.setConsecutiveAtRiskDays(consecutive);
            intakeDayStatusRepository.save(record);

            boolean hasActivePt = mappingRepository.findFirstByClient_IdAndStatus(customerId, ClientMappingStatus.ACTIVE).isPresent();
            boolean suggestSubmit = reviewNotRequired && hasActivePt
                    && (dayStatus == IntakeStatus.OVER_MACRO || dayStatus == IntakeStatus.UNDER_INTAKE
                    || dayStatus == IntakeStatus.AT_RISK);

            boolean hasPendingReviewToday = dietLogRepository.existsByCustomerIdAndLogDateAndReviewStatus(
                    customerId, date, DietLogReviewStatus.PENDING);
            boolean ptAlertSent = false;
            if (dayStatus == IntakeStatus.AT_RISK && hasActivePt && shouldSendPtAlert(record)
                    && !hasPendingReviewToday) {
                ptAlertSent = notifyPt(customerId, date, dayStatus, consecutive, record);
            }

            return IntakeControlResult.builder()
                    .intakeStatus(dayStatus)
                    .controlLoopMessage(buildMessage(dayStatus, totalCalories, targetCalories))
                    .suggestSubmitToPt(suggestSubmit)
                    .ptAlertSent(ptAlertSent)
                    .build();
        } catch (Exception e) {
            log.error("Control loop failed for user {}", customerId, e);
            return IntakeControlResult.builder()
                    .intakeStatus(IntakeStatus.OK)
                    .controlLoopMessage(null)
                    .suggestSubmitToPt(false)
                    .ptAlertSent(false)
                    .build();
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtClientAlertDto> getActiveAlertsForPt(UUID ptId) {
        return mappingRepository.findByPtIdWithClients(ptId).stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE)
                .map(PtClientMapping::getClient)
                .map(client -> {
                    LocalDate today = LocalDate.now();
                    return intakeDayStatusRepository.findByUserIdAndLogDate(client.getId(), today)
                            .filter(s -> s.getStatus() == IntakeStatus.AT_RISK
                                    || s.getStatus() == IntakeStatus.OVER_MACRO
                                    || s.getStatus() == IntakeStatus.UNDER_INTAKE)
                            .map(s -> PtClientAlertDto.builder()
                                    .clientId(client.getId())
                                    .clientName(client.getFullName())
                                    .intakeStatus(s.getStatus())
                                    .reason(buildMessage(s.getStatus(), sumLoggedCalories(client.getId(), today),
                                            resolveTargetCalories(client.getId())))
                                    .logDate(s.getLogDate())
                                    .consecutiveAtRiskDays(s.getConsecutiveAtRiskDays() != null
                                            ? s.getConsecutiveAtRiskDays() : 0)
                                    .alertType("DIET_VIOLATION")
                                    .build())
                            .orElse(null);
                })
                .filter(a -> a != null)
                .toList();
    }

    private boolean shouldSendPtAlert(IntakeDayStatus record) {
        if (record.getPtAlertedAt() == null) {
            return true;
        }
        return Duration.between(record.getPtAlertedAt(), LocalDateTime.now()).toHours() >= 24;
    }

    private boolean notifyPt(UUID customerId, LocalDate date, IntakeStatus status, int consecutive,
                             IntakeDayStatus record) {
        List<PtClientMapping> mappings = mappingRepository.findFirstByClient_IdAndStatus(customerId, ClientMappingStatus.ACTIVE)
                .map(List::of)
                .orElse(List.of());
        if (mappings.isEmpty()) {
            return false;
        }
        String clientName = userRepository.findById(customerId).map(u -> u.getFullName()).orElse("Client");
        String reason = buildMessage(status, sumLoggedCalories(customerId, date), resolveTargetCalories(customerId));
        Map<String, Object> payload = new HashMap<>();
        payload.put("clientId", customerId.toString());
        payload.put("clientName", clientName);
        payload.put("intakeStatus", status.name());
        payload.put("reason", reason);
        payload.put("logDate", date.toString());
        payload.put("consecutiveAtRiskDays", consecutive);

        for (PtClientMapping mapping : mappings) {
            webSocketSessionService.sendToUser(mapping.getPt().getId(), "PT_CLIENT_ALERT", payload);
        }
        record.setPtAlertedAt(LocalDateTime.now());
        intakeDayStatusRepository.save(record);
        return true;
    }

    private int computeConsecutiveAtRisk(UUID customerId, LocalDate date, IntakeStatus todayStatus) {
        boolean riskyToday = todayStatus == IntakeStatus.OVER_MACRO
                || todayStatus == IntakeStatus.UNDER_INTAKE
                || todayStatus == IntakeStatus.AT_RISK;
        if (!riskyToday) {
            return 0;
        }
        int count = 1;
        LocalDate cursor = date.minusDays(1);
        while (count < 3) {
            IntakeStatus prev = intakeDayStatusRepository.findByUserIdAndLogDate(customerId, cursor)
                    .map(IntakeDayStatus::getStatus)
                    .orElse(IntakeStatus.OK);
            if (prev == IntakeStatus.OVER_MACRO || prev == IntakeStatus.UNDER_INTAKE || prev == IntakeStatus.AT_RISK) {
                count++;
                cursor = cursor.minusDays(1);
            } else {
                break;
            }
        }
        return count;
    }

    private BigDecimal sumLoggedCalories(UUID customerId, LocalDate date) {
        List<DietLog> logs = dietLogRepository.findByCustomerIdAndLogDate(customerId, date);
        BigDecimal total = MacroUtils.ZERO;
        for (DietLog log : logs) {
            if (log.getStatus() == DietLogStatus.LOGGED && log.getMacrosJson() != null) {
                total = MacroUtils.add(total, log.getMacrosJson().calories());
            }
        }
        return total;
    }

    private BigDecimal resolveTargetCalories(UUID customerId) {
        return macroTargetRepository.findByUserId(customerId)
                .map(MacroTarget::getDailyCalories)
                .filter(c -> c.compareTo(BigDecimal.ZERO) > 0)
                .orElse(BigDecimal.valueOf(2000));
    }

    private String buildMessage(IntakeStatus status, BigDecimal total, BigDecimal target) {
        return switch (status) {
            case OVER_MACRO -> "Hôm nay bạn đã nạp " + total.intValue() + " kcal, vượt ~20% mục tiêu " + target.intValue() + " kcal.";
            case UNDER_INTAKE -> "Hôm nay mới " + total.intValue() + " kcal — dưới 50% mục tiêu. Hãy bổ sung bữa ăn.";
            case AT_RISK -> "Bạn đang AT_RISK: macro lệch nhiều ngày liên tiếp. Cân nhắc gửi PT kiểm tra.";
            default -> "Macro hôm nay đang trong mục tiêu (" + total.intValue() + "/" + target.intValue() + " kcal).";
        };
    }
}
