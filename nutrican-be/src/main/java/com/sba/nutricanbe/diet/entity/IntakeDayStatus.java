package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.diet.enums.IntakeStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "intake_day_status", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "log_date"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class IntakeDayStatus extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private IntakeStatus status;

    @Column(name = "consecutive_at_risk_days")
    @Builder.Default
    private Integer consecutiveAtRiskDays = 0;

    @Column(name = "pt_alerted_at")
    private LocalDateTime ptAlertedAt;
}
