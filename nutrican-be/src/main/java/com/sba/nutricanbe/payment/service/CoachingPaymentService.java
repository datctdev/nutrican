package com.sba.nutricanbe.payment.service;

import com.sba.nutricanbe.payment.dto.CoachingPaymentResult;
import com.sba.nutricanbe.payment.dto.CreateCoachingPaymentResponse;

import java.util.Map;
import java.util.UUID;

public interface CoachingPaymentService {
    CreateCoachingPaymentResponse createVnPayPayment(UUID mappingId, UUID customerId);
    CoachingPaymentResult processVnPayCallback(Map<String, String> params);
}
