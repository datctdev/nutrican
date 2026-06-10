package com.sba.nutrican_be.core.entity;

import com.sba.nutrican_be.core.enums.DietLogItemSource;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "diet_log_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class DietLogItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diet_log_id", nullable = false)
    private DietLog dietLog;

    @Column(name = "food_item_id")
    private UUID foodItemId;

    @Column(name = "item_name")
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

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DietLogItemSource source;
}
