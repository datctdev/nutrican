package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.diet.enums.MealSource;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "user_recipes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class UserRecipe extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_source")
    @Builder.Default
    private MealSource mealSource = MealSource.HOME_COOKED;

    @Column(name = "total_calories", precision = 10, scale = 2)
    private BigDecimal totalCalories;

    @Column(name = "total_protein", precision = 10, scale = 2)
    private BigDecimal totalProtein;

    @Column(name = "total_carb", precision = 10, scale = 2)
    private BigDecimal totalCarb;

    @Column(name = "total_fat", precision = 10, scale = 2)
    private BigDecimal totalFat;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserRecipeIngredient> ingredients = new ArrayList<>();
}
