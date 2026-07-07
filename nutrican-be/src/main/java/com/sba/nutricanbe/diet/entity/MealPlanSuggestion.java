package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.diet.enums.MealPlanSuggestionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "meal_plan_suggestions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class MealPlanSuggestion extends BaseEntity {

    @Column(name = "meal_plan_item_id", nullable = false)
    private UUID mealPlanItemId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "suggested_food_code", length = 100)
    private String suggestedFoodCode;

    @Column(name = "suggested_food_name")
    private String suggestedFoodName;

    @Column(name = "suggested_gram", precision = 10, scale = 2)
    private BigDecimal suggestedGram;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MealPlanSuggestionStatus status = MealPlanSuggestionStatus.PENDING;

    @Column(name = "pt_note", columnDefinition = "TEXT")
    private String ptNote;
}
