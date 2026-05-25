package com.sba.nutrican_be.workspace.dto;

import com.sba.nutrican_be.core.enums.ClientMappingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientStatusDto {
    private Long clientId;
    private String clientName;
    private String avatarUrl;
    private String status;
    private String statusLabel;
    private String statusColor;
    private String lastLogTime;
    private java.math.BigDecimal avgCalories;
}
