package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "food_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class FoodItem extends BaseEntity {

    @Column(name = "name_vi", nullable = false)
    private String nameVi;

    @Column(name = "name_en")
    private String nameEn;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> aliases;

    @Column(length = 50)
    private String category;

    @Column(name = "serving_size_g", precision = 10, scale = 2)
    private BigDecimal servingSizeG;

    @Column(precision = 10, scale = 2)
    private BigDecimal calories;

    @Column(precision = 10, scale = 2)
    private BigDecimal protein;

    @Column(precision = 10, scale = 2)
    private BigDecimal carb;

    @Column(precision = 10, scale = 2)
    private BigDecimal fat;

    @Column(name = "is_composite")
    @Builder.Default
    private Boolean isComposite = false;

    @Column(name = "parent_id")
    private UUID parentId;

    @Column(length = 50)
    @Builder.Default
    private String source = "INTERNAL_SEED";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "diet_tags", columnDefinition = "jsonb")
    private List<String> dietTags;
}
