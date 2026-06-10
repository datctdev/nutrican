package com.sba.nutrican_be.core.dto;

import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.SOSTicketStatus;
import com.sba.nutrican_be.core.enums.SosReasonCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SosTicketResponse {
    private UUID id;
    private UUID dietLogId;
    private String note;
    private String priority;
    private SOSTicketStatus status;
    private SosReasonCode reasonCode;
    private MealSource mealSource;
    private Boolean autoCreated;
    private String customerName;
    private String ptName;
    private LocalDateTime createdAt;
}
