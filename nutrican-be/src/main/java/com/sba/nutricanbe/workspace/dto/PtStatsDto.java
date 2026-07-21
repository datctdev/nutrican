package com.sba.nutricanbe.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtStatsDto {
    private long totalClients;
    private long pendingReviews;
    private long reviewsThisWeek;
    private BigDecimal averageAdherenceRate;
}
