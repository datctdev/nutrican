package com.sba.nutricanbe.workspace.dto;

import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ReviewActionRequest {
    private String action;
    private BigDecimal adjustedCalories;
    private BigDecimal adjustedProtein;
    private BigDecimal adjustedCarb;
    private BigDecimal adjustedFat;
    private String note;
    private PtCorrectionReason correctionReason;
}
