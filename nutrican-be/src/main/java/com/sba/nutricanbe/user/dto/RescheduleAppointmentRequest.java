package com.sba.nutricanbe.user.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RescheduleAppointmentRequest {
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}
