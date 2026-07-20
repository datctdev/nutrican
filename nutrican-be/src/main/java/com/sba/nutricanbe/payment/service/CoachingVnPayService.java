package com.sba.nutricanbe.payment.service;

import com.sba.nutricanbe.payment.entity.Payment;

import java.util.Map;

public interface CoachingVnPayService {
    boolean verifyChecksumFromMap(Map<String, String> params);
    String buildPaymentUrl(Payment payment);
}
