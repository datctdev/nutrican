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

    /** Required when trainingMode is OFFLINE */
    private UUID venueId;

    /** OFFLINE: one or more session start times (package hire) */
    private List<LocalDateTime> sessionStarts;

    /** Prefer {@code sessionStarts}; retained for older clients. */
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
