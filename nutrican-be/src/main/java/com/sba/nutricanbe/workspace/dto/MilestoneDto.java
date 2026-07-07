package com.sba.nutricanbe.workspace.dto;

import com.sba.nutricanbe.user.enums.MilestoneType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class MilestoneDto {
    private UUID id;
    private MilestoneType milestoneType;
    private String title;
    private LocalDateTime achievedAt;
    private String note;
}
