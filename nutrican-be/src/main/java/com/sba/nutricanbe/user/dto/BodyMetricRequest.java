package com.sba.nutricanbe.user.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BodyMetricRequest {
    private LocalDate recordDate;
    private BigDecimal weight;
    private BigDecimal bodyFatPercent;
    private String note;
}
