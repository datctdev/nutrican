package com.sba.nutricanbe.kyc.dto.response;

import com.sba.nutricanbe.common.enums.KycStatus;
import com.sba.nutricanbe.kyc.entity.EkycSession;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class EkycSessionResponse {
    private UUID id;
    private UUID userId;
    private KycStatus status;
    private UUID frontFileId;
    private UUID backFileId;
    private UUID selfieFileId;
    private String frontHash;
    private String backHash;
    private String selfieHash;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EkycSessionResponse from(EkycSession s) {
        if (s == null) {
            return null;
        }
        return EkycSessionResponse.builder()
                .id(s.getId())
                .userId(s.getUserId())
                .status(s.getStatus())
                .frontFileId(s.getFrontFileId())
                .backFileId(s.getBackFileId())
                .selfieFileId(s.getSelfieFileId())
                .frontHash(s.getFrontHash())
                .backHash(s.getBackHash())
                .selfieHash(s.getSelfieHash())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
