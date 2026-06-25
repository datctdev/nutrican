package com.sba.nutricanbe.userprofile.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private UUID id;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String address;
    private String dateOfBirth;
    private String avatarUrl;
    private String role;
    private String status;
    private LocalDateTime createdAt;
    private Boolean isKycVerified;
    private PtProfileSummary ptProfile;
}
