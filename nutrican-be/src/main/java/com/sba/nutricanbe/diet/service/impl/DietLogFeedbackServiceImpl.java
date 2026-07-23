package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.dto.request.DietLogFeedbackRequest;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogFeedback;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.repository.DietLogFeedbackRepository;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.service.DietLogFeedbackService;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DietLogFeedbackServiceImpl implements DietLogFeedbackService {

    private final DietLogRepository dietLogRepository;
    private final DietLogFeedbackRepository feedbackRepository;
    private final PtClientMappingRepository mappingRepository;
    private final WebSocketSessionService webSocketSessionService;

    @Override
    @Transactional
    public DietLogFeedback saveFeedback(UUID customerId, UUID logId, DietLogFeedbackRequest request) {
        DietLog log = dietLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));
        if (!log.getCustomerId().equals(customerId)) {
            throw new BadRequestException("Not your diet log");
        }
        if (log.getStatus() != DietLogStatus.LOGGED) {
            throw new BadRequestException("Only LOGGED meals can be rated");
        }
        DietLogFeedback feedback = feedbackRepository.findByDietLogId(logId)
                .orElse(DietLogFeedback.builder().dietLogId(logId).build());
        feedback.setEnergyRating(request.getEnergyRating());
        feedback.setHungerAfterRating(request.getHungerAfterRating());
        feedback.setDigestionStatus(request.getDigestionStatus());
        feedback.setDigestionNote(request.getDigestionNote());
        DietLogFeedback saved = feedbackRepository.save(feedback);
        checkNutritionRisk(customerId);
        return saved;
    }

    private void checkNutritionRisk(UUID customerId) {
        List<DietLog> recent = dietLogRepository.findByCustomerIdOrderByCreatedAtDesc(
                customerId, org.springframework.data.domain.PageRequest.of(0, 3));
        if (recent.size() < 3) {
            return;
        }
        List<UUID> ids = recent.stream().map(DietLog::getId).toList();
        long lowEnergy = feedbackRepository.findByDietLogIdIn(ids).stream()
                .filter(f -> f.getEnergyRating() != null && f.getEnergyRating() == 1)
                .count();
        if (lowEnergy >= 3) {
            mappingRepository.findFirstByClient_IdAndStatusIn(
                            customerId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))
                    .ifPresent(m -> {
                        Map<String, Object> payload = new HashMap<>();
                        payload.put("clientId", customerId.toString());
                        payload.put("intakeStatus", "AT_RISK_NUTRITION");
                        payload.put("reason", "Client báo energy=1 trong 3 bữa gần nhất");
                        webSocketSessionService.sendToUser(m.getPt().getId(), "PT_CLIENT_ALERT", payload);
                    });
        }
    }
}
