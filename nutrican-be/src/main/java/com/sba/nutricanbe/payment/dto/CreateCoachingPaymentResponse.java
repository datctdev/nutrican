package com.sba.nutricanbe.payment.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class CreateCoachingPaymentResponse {
    private UUID paymentId;
    private UUID mappingId;
    private String orderNumber;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String paymentUrl;
}
