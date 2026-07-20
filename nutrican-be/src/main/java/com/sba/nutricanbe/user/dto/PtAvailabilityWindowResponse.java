package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.PtAvailabilityWindow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtAvailabilityWindowResponse {

    private UUID id;
    private Integer dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer slotMinutes;

    public static PtAvailabilityWindowResponse from(PtAvailabilityWindow window) {
        return PtAvailabilityWindowResponse.builder()
                .id(window.getId())
                .dayOfWeek(window.getDayOfWeek())
                .startTime(window.getStartTime())
                .endTime(window.getEndTime())
                .slotMinutes(window.getSlotMinutes())
                .build();
    }
}
