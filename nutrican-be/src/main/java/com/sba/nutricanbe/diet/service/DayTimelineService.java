package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.diet.dto.response.DayTimelineResponse;

import java.time.LocalDate;
import java.util.UUID;

public interface DayTimelineService {
    DayTimelineResponse getDayTimeline(UUID customerId, LocalDate date);
}
