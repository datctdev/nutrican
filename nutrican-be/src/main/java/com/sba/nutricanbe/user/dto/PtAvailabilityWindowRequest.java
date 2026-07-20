package com.sba.nutricanbe.user.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalTime;

@Data
public class PtAvailabilityWindowRequest {

    @NotNull(message = "Day of week is required")
    @Min(1)
    @Max(7)
    private Integer dayOfWeek;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    @Min(30)
    @Max(120)
    private Integer slotMinutes;
}
