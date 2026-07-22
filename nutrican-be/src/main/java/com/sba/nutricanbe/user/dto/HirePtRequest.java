package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.TrainingMode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class HirePtRequest {

    @NotNull(message = "Training mode is required")
    private TrainingMode trainingMode;


    private UUID venueId;


    private List<LocalDateTime> sessionStarts;


    private LocalDateTime firstSessionStart;

    public List<LocalDateTime> resolvedSessionStarts() {
        if (sessionStarts != null && !sessionStarts.isEmpty()) {
            return sessionStarts;
        }
        if (firstSessionStart != null) {
            return List.of(firstSessionStart);
        }
        return List.of();
    }
}
