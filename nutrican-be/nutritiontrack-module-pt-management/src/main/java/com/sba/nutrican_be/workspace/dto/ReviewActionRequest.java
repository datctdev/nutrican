package com.sba.nutrican_be.workspace.dto;

import com.sba.nutrican_be.core.enums.PtCorrectionReason;
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
