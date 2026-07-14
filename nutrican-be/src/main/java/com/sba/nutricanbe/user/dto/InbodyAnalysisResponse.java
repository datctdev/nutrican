package com.sba.nutricanbe.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InbodyAnalysisResponse {
    private BigDecimal weight;
    private BigDecimal bodyFatPercent;
    private BigDecimal muscleMass;
    private BigDecimal lbm;

    private BigDecimal rawWeight;
    private BigDecimal rawMuscleMass;
    private BigDecimal rawLbm;
    private String rawUnit;

    private Integer height;
    private Integer age;
    private String gender;
}
