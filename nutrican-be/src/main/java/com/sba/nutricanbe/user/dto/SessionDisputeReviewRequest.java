package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.SessionDisputeDecision;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SessionDisputeReviewRequest {
    private SessionDisputeDecision decision;
    private BigDecimal ptAmount;
    private BigDecimal customerAmount;
    private String adminNote;
}
