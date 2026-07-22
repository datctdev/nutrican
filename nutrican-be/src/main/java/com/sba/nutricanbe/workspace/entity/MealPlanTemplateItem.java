package com.sba.nutricanbe.workspace.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "meal_plan_template_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class MealPlanTemplateItem extends BaseEntity {

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "day_offset", nullable = false)
    private Integer dayOffset; // 0 to 6 representing the day of the week

    /** Stored as diet MealType name (BREAKFAST/LUNCH/DINNER/SNACK) without cross-module enum coupling. */
    @Column(name = "meal_type", nullable = false, length = 20)
    private String mealType;

    @Column(name = "food_code", length = 100)
    private String foodCode;

    @Column(name = "free_text", length = 255)
    private String freeText;

    @Column(name = "portion_grams", precision = 10, scale = 2)
    private BigDecimal portionGrams;

    @Column(length = 500)
    private String note;
}
