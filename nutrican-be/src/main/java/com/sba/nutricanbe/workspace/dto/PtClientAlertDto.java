package com.sba.nutricanbe.workspace.dto;

import com.sba.nutricanbe.diet.enums.IntakeStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtClientAlertDto {
    private UUID clientId;
    private String clientName;
    private IntakeStatus intakeStatus;
    private String reason;
    private LocalDate logDate;
    private int consecutiveAtRiskDays;
    private String alertType;
}
