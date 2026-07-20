package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "self_plan_items", indexes = {
        @Index(name = "idx_self_plan_customer_date", columnList = "customer_id, plan_date")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class SelfPlanItem extends BaseEntity {

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", length = 20, nullable = false)
    private MealType mealType;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_period", length = 20)
    private MealPeriod mealPeriod;

    @Column(name = "food_item_id")
    private UUID foodItemId;

    @Column(name = "item_name", length = 255)
    private String itemName;

    @Column(name = "quantity_g", precision = 10, scale = 2)
    private BigDecimal quantityG;

    @Column(precision = 10, scale = 2)
    private BigDecimal calories;

    @Column(precision = 10, scale = 2)
    private BigDecimal protein;

    @Column(precision = 10, scale = 2)
    private BigDecimal carb;

    @Column(precision = 10, scale = 2)
    private BigDecimal fat;

    @Column(name = "eaten", nullable = false)
    @Builder.Default
    private Boolean eaten = false;

    @Column(name = "diet_log_id")
    private UUID dietLogId;

    @Column(name = "submission_id")
    private UUID submissionId;

    @Column(name = "locked_by_review", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean lockedByReview = false;

    @Column(name = "applied", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean applied = false;
}
