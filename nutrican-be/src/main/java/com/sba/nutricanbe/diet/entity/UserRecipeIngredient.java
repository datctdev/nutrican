package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "user_recipe_ingredients")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class UserRecipeIngredient extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    private UserRecipe recipe;

    @Column(name = "food_item_id", nullable = false)
    private UUID foodItemId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal gram;

    @Column(precision = 10, scale = 2)
    private BigDecimal calories;

    @Column(precision = 10, scale = 2)
    private BigDecimal protein;

    @Column(precision = 10, scale = 2)
    private BigDecimal carb;

    @Column(precision = 10, scale = 2)
    private BigDecimal fat;

    @Column(name = "item_name")
    private String itemName;
}
