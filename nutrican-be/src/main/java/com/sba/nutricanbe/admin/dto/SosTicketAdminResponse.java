package com.sba.nutricanbe.admin.dto;

import com.sba.nutricanbe.diet.enums.SosTicketStatus;
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
public class SosTicketAdminResponse {
    private UUID id;
    private UUID dietLogId;
    private String note;
    private String priority;
    private SosTicketStatus status;
    private String customerName;
    private String ptName;
    private LocalDateTime createdAt;
}
