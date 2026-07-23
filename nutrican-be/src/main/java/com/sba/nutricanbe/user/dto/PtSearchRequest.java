package com.sba.nutricanbe.user.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
public class PtSearchRequest {
    private String specialization;
    private Integer minExperience;
    private Boolean verifiedOnly;
    private String tier;
    private String goalFilter;
    private String dietFilter;
    private String gender;
    private String trainingMode;
    private String location;
    private BigDecimal maxRate;
    private BigDecimal minRating;
    private String sort = "tier";
    private String sortBy = "tier";
    private String sortDir = "desc";
    private UUID customerId;
    private String customerNutritionGoal;
    private String customerDietPreference;
    private String search;
    private int page = 0;
    private int size = 12;
}