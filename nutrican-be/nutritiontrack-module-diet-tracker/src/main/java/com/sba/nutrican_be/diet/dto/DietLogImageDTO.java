package com.sba.nutrican_be.diet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietLogImageDTO {
    private UUID id;
    private UUID dietLogId;
    private String imageUrl;
    private String imageObjectName;
    private Boolean isPrimary;
    private Integer sortOrder;
    private Long fileSize;
    private String contentType;
    private BigDecimal aiConfidenceScore;
    private Map<String, Object> macrosJson;
}
