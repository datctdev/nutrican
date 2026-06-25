package com.sba.nutricanbe.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingPtDto {
    private UUID id;
    private UUID userId;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String bio;
    private String trainingPhilosophy;
    private Integer yearsOfExperience;
    private String certifications;
    private String cvUrl;
    private String documentUrls;
    private String verificationStatus;
    private LocalDateTime createdAt;
}
