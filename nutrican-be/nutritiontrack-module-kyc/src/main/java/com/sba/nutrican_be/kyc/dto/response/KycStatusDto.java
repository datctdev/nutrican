package com.sba.nutrican_be.kyc.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KycStatusDto {
    private boolean isKycVerified;
    private String verificationStatus;
    private String rejectionReason;
    private LocalDateTime reviewedAt;
}
