package com.sba.nutricanbe.user.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sba.nutricanbe.common.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "body_metrics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(exclude = {"user"})
public class BodyMetric extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(precision = 5, scale = 2)
    private BigDecimal weight;

    @Column(name = "body_fat_percent", precision = 5, scale = 2)
    private BigDecimal bodyFatPercent;

    @Column(precision = 5, scale = 2)
    private BigDecimal lbm;

    @Column(precision = 5, scale = 2)
    private BigDecimal muscleMass;

    @Column(columnDefinition = "TEXT")
    private String note;
}

