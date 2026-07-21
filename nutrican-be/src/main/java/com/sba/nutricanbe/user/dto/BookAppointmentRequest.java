package com.sba.nutricanbe.user.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BookAppointmentRequest {
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String type;
    private String note;
}
