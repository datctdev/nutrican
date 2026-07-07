package com.sba.nutricanbe.diet.dto;

import com.sba.nutricanbe.diet.enums.IntakeStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntakeControlResult {
    private IntakeStatus intakeStatus;
    private String controlLoopMessage;
    private boolean suggestSubmitToPt;
    private boolean ptAlertSent;
}
