package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.request.DietLogFeedbackRequest;
import com.sba.nutricanbe.diet.entity.DietLogFeedback;

import java.util.UUID;

public interface DietLogFeedbackService {
    DietLogFeedback saveFeedback(UUID customerId, UUID logId, DietLogFeedbackRequest request);
}
