package com.sba.nutricanbe.workspace.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RegressionAlertDto {
    private boolean active;
    private String message;
}
