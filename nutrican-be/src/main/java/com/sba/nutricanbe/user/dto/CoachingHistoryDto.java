package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class CoachingHistoryDto {
    private UUID mappingId;
    private UUID ptId;
    private UUID ptProfileId;
    private String ptName;
    private String ptAvatarUrl;
    private ClientMappingStatus status;
    private LocalDateTime completedAt;
    private LocalDateTime assignedAt;
    private Boolean hasReviewed;
}