package com.sba.nutricanbe.diet.dto.request;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class MealPlanRequest {
    private UUID clientId;
    private LocalDate weekStart;
    private String notes;
    private List<MealPlanItemRequest> items;
}
