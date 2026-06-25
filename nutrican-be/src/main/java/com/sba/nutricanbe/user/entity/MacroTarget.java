package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "macro_targets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(exclude = {"user"})
public class MacroTarget extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "daily_calories", precision = 10)
    private BigDecimal dailyCalories;

    @Column(precision = 10)
    private BigDecimal protein;

    @Column(precision = 10)
    private BigDecimal carb;

    @Column(precision = 10)
    private BigDecimal fat;
}

