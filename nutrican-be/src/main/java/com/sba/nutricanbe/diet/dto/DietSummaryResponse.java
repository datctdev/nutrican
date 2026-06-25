package com.sba.nutricanbe.diet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietSummaryResponse {
    private LocalDate date;
    private BigDecimal totalCalories;
    private BigDecimal totalProtein;
    private BigDecimal totalCarbs;
    private BigDecimal totalFat;
    private BigDecimal targetCalories;
    private BigDecimal targetProtein;
    private BigDecimal targetCarb;
    private BigDecimal targetFat;
    private List<DietLogResponse> logs;
}
