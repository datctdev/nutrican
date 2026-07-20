package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.common.enums.RequestStatus;
import com.sba.nutricanbe.user.entity.PtUpdateRequest;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class PtUpdateRequestDto {
    private UUID id;
    private UUID ptId;
    private String ptName;
    private Map<String, Object> requestedData;
    private String reason;
    private RequestStatus status;
    private String adminNote;
    private LocalDateTime createdAt;

    public static PtUpdateRequestDto fromEntity(PtUpdateRequest entity) {
        return PtUpdateRequestDto.builder()
                .id(entity.getId())
                .ptId(entity.getPt().getId())
                .ptName(entity.getPt().getFullName())
                .requestedData(entity.getRequestedData())
                .reason(entity.getReason())
                .status(entity.getStatus())
                .adminNote(entity.getAdminNote())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}