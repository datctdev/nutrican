package com.sba.nutricanbe.user.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BodyMetricRequest {
    private LocalDate recordDate;

    @NotNull(message = "Cân nặng là bắt buộc")
    @DecimalMin(value = "1.0", message = "Cân nặng phải lớn hơn 0")
    @DecimalMax(value = "300.0", message = "Cân nặng không hợp lệ")
    private BigDecimal weight;

    private BigDecimal bodyFatPercent;
    private BigDecimal muscleMass;
    private BigDecimal lbm;
    private String note;
}
