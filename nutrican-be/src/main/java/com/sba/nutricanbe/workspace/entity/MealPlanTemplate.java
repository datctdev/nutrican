package com.sba.nutricanbe.workspace.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "meal_plan_templates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class MealPlanTemplate extends BaseEntity {

    @Column(name = "pt_id", nullable = false)
    private UUID ptId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;
}
