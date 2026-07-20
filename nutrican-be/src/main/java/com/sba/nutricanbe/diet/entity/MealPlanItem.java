package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.diet.enums.MealPlanItemSourceType;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "meal_plan_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class MealPlanItem extends BaseEntity {

    @Column(name = "meal_plan_id", nullable = false)
    private UUID mealPlanId;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", length = 20)
    private MealType mealType;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_period", length = 20)
    private MealPeriod mealPeriod;

    @Column(name = "food_code", length = 100)
    private String foodCode;

    @Column(name = "free_text", columnDefinition = "TEXT")
    private String freeText;

    @Column(name = "portion_grams", precision = 10, scale = 2)
    private BigDecimal portionGrams;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "eaten")
    @Builder.Default
    private Boolean eaten = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "skip_reason", length = 20)
    private com.sba.nutricanbe.diet.enums.MealPlanSkipReason skipReason;

    @Column(name = "skip_note", columnDefinition = "TEXT")
    private String skipNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", length = 20, nullable = false,
            columnDefinition = "varchar(20) default 'PT_ORIGINAL'")
    @Builder.Default
    private MealPlanItemSourceType sourceType = MealPlanItemSourceType.PT_ORIGINAL;

    @Column(name = "food_item_id")
    private UUID foodItemId;
}
