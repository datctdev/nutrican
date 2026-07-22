package com.sba.nutricanbe.diet.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "weekly_summaries", uniqueConstraints = {
        @UniqueConstraint(name = "uk_weekly_summary_pt_client_week",
                columnNames = {"pt_id", "client_id", "week_start_date"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class WeeklySummary extends BaseEntity {

    @Column(name = "mapping_id")
    private UUID mappingId;

    @Column(name = "pt_id", nullable = false)
    private UUID ptId;

    @Column(name = "client_id", nullable = false)
    private UUID clientId;

    @Column(name = "week_start_date", nullable = false)
    private LocalDate weekStartDate;

    @Column(name = "summary_text", columnDefinition = "TEXT")
    private String summaryText;

    @Column(name = "adherence_rate", precision = 5, scale = 2)
    private BigDecimal adherenceRate;

    @Column(name = "next_plan_note", columnDefinition = "TEXT")
    private String nextPlanNote;
}
