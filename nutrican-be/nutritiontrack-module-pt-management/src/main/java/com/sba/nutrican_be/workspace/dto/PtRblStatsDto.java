package com.sba.nutrican_be.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtRblStatsDto {
    private int totalReviewed;
    private int totalLabeledCv;
    private BigDecimal maeAiCalories;
    private double adjustRate;
}
