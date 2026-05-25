package com.sba.nutrican_be.workspace.dto;

import com.sba.nutrican_be.core.enums.DietLogStatus;
import com.sba.nutrican_be.core.enums.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietLogReviewResponse {
    private Long id;
    private Long customerId;
    private String customerName;
    private String customerAvatar;
    private String imageUrl;
    private MealType mealType;
    private String foodDescription;
    private BigDecimal aiConfidenceScore;
    private Map<String, Object> macrosJson;
    private DietLogStatus status;
    private Boolean sosTicketFlag;
    private LocalDate logDate;
    private LocalDateTime createdAt;
}
