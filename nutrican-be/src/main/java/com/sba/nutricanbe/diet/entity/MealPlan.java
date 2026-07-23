package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.diet.enums.MealPlanWeekBasis;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "meal_plans")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class MealPlan extends BaseEntity {

    @Column(name = "client_id", nullable = false)
    private UUID clientId;

    @Column(name = "pt_id", nullable = false)
    private UUID ptId;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    /** Additive: MONDAY = legacy calendar week; COACHING = coachingStartedAt + 7*i. */
    @Enumerated(EnumType.STRING)
    @Column(name = "week_basis", length = 20)
    @Builder.Default
    private MealPlanWeekBasis weekBasis = MealPlanWeekBasis.MONDAY;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_published")
    @Builder.Default
    private Boolean isPublished = false;
}
