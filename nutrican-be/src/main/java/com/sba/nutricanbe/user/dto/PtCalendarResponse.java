package com.sba.nutricanbe.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtCalendarResponse {

    private List<PtVenueResponse> venues;
    private List<PtAvailabilityWindowResponse> availability;
    private List<OccupiedSlotResponse> occupiedSlots;
    private BigDecimal offlineRate;
    private String offlineRateUnit;
    private Integer slotMinutes;
}
