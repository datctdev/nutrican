package com.sba.nutricanbe.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OccupiedSlotResponse {

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String source;
}
