package com.sba.nutrican_be.diet.dto;

import com.sba.nutrican_be.core.enums.DietLogStatus;
import com.sba.nutrican_be.core.enums.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietLogResponse {
    private UUID id;
    private UUID customerId;
    private String customerName;
    private String imageUrl;
    private BigDecimal aiConfidenceScore;
    private Map<String, Object> macrosJson;
    private MealType mealType;
    private DietLogStatus status;
    private String foodDescription;
    private Boolean sosTicketFlag;
    private UUID ptReviewerId;
    private String ptNote;
    private LocalDate logDate;
    private LocalDateTime createdAt;
    private java.util.List<DietLogImageDTO> additionalImages;
}
