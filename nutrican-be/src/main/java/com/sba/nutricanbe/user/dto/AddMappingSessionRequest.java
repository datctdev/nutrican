package com.sba.nutricanbe.user.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AddMappingSessionRequest {
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String note;
}
