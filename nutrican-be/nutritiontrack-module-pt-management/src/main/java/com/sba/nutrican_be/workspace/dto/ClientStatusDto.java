package com.sba.nutrican_be.workspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientStatusDto {
    private UUID clientId;
    private String clientName;
    private String avatarUrl;
    private String status;
    private String statusLabel;
    private String statusColor;
    private String lastLogTime;
    private java.math.BigDecimal avgCalories;
}
