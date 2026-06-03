package com.sba.nutrican_be.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingKycDto {
    private UUID id;
    private UUID userId;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String idCardNumber;
    private String fullNameOnCard;
    private LocalDate dateOfBirthOnCard;
    private String addressOnCard;
    private String idCardFrontUrl;
    private String idCardBackUrl;
    private String verificationStatus;
    private LocalDateTime createdAt;
}
