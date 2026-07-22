package com.sba.nutricanbe.payment.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class ExtraSessionsPurchaseResponse {
    private UUID paymentId;
    private UUID mappingId;
    private UUID purchaseId;
    private String orderNumber;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String payMethod;
    private String paymentUrl;
    private boolean fulfilled;
    private int sessionCount;
    private String message;
}
