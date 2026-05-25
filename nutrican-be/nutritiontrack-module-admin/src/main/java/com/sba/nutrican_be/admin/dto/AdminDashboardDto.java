package com.sba.nutrican_be.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardDto {
    private long totalUsers;
    private long totalCustomers;
    private long totalPts;
    private long pendingPtVerifications;
    private long activeSosTickets;
    private long totalDietLogs;
    private BigDecimal averageRating;
}
