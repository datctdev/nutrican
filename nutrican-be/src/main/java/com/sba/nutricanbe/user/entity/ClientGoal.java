package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "client_goals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class ClientGoal extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "nutrition_goal")
    private NutritionGoal nutritionGoal;

    @Column(name = "target_weight", precision = 5, scale = 2)
    private BigDecimal targetWeight;

    @Column(name = "baseline_weight", precision = 5, scale = 2)
    private BigDecimal baselineWeight;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "trimester")
    private Integer trimester;
}
