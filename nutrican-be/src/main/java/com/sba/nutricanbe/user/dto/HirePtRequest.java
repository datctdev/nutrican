package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.TrainingMode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HirePtRequest {

    @NotNull(message = "Training mode is required")
    private TrainingMode trainingMode;
}
