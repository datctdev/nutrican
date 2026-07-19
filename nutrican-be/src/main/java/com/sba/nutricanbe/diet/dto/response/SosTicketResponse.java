package com.sba.nutricanbe.diet.dto.response;

import com.sba.nutricanbe.diet.enums.MealSource;
import com.sba.nutricanbe.diet.enums.SosTicketStatus;
import com.sba.nutricanbe.diet.enums.SosReasonCode;
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
    private String resolutionNote;
    private String priority;
    private SosTicketStatus status;
    private SosReasonCode reasonCode;
    private MealSource mealSource;
    private Boolean autoCreated;
    private String customerName;
    private String ptName;
    private LocalDateTime createdAt;
    private LocalDateTime assignedAt;
    private LocalDateTime firstResponseAt;
    private LocalDateTime resolvedAt;
    private Boolean slaBreached;
    private Integer escalationCount;
}
