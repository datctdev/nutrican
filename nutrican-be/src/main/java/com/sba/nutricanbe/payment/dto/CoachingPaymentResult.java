package com.sba.nutricanbe.payment.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CoachingPaymentResult {
    private UUID paymentId;
    private UUID mappingId;
    private String paymentStatus;
    private String mappingStatus;
    private boolean success;
    private String message;
}
