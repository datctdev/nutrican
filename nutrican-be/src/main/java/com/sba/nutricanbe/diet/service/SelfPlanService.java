package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.request.SelfPlanItemRequest;
import com.sba.nutricanbe.diet.dto.request.SelfPlanItemUpdateRequest;
import com.sba.nutricanbe.diet.dto.response.DietLogResponse;
import com.sba.nutricanbe.diet.dto.response.SelfPlanItemResponse;
import com.sba.nutricanbe.diet.dto.response.SelfPlanSubmissionResponse;
import com.sba.nutricanbe.diet.enums.SelfPlanSubmissionStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SelfPlanService {
    List<SelfPlanItemResponse> list(UUID customerId, LocalDate date);

    SelfPlanItemResponse create(UUID customerId, SelfPlanItemRequest request);

    SelfPlanItemResponse update(UUID customerId, UUID id, SelfPlanItemUpdateRequest request);

    void delete(UUID customerId, UUID id);

    DietLogResponse markEaten(UUID customerId, UUID id);

    SelfPlanSubmissionResponse submit(UUID customerId, LocalDate date);

    SelfPlanSubmissionResponse cancel(UUID customerId, UUID submissionId);

    List<SelfPlanSubmissionResponse> listSubmissions(UUID customerId, LocalDate date, SelfPlanSubmissionStatus status);
}
