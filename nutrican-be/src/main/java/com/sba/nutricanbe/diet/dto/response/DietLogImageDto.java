package com.sba.nutricanbe.diet.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

import com.sba.nutricanbe.common.dto.MacroNutrients;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietLogImageDto {
    private UUID id;
    private UUID dietLogId;
    private String imageUrl;
    private String imageObjectName;
    private Boolean isPrimary;
    private Integer sortOrder;
    private Long fileSize;
    private String contentType;
    private BigDecimal aiConfidenceScore;
    private MacroNutrients macrosJson;
}
