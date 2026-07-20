package com.sba.nutricanbe.admin.dto;

import com.sba.nutricanbe.user.dto.CertificationData;
import com.sba.nutricanbe.user.enums.TrainingMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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
    private String preferredTrack;
    private String bio;
    private String trainingPhilosophy;
    private String contactPhone;
    private LocalDate experienceStartDate;
    private Integer yearsOfExperience;
    private List<String> specializations;
    private TrainingMode trainingMode;
    private String location;
    private BigDecimal onlineRate;
    private String onlineRateUnit;
    private BigDecimal offlineRate;
    private String offlineRateUnit;
    private List<CertificationData> certifications;
    private String cvUrl;
    private String instagramUrl;
    private String linkedinUrl;
    private String gender;
    private String adminRejectNote;
    private String documentUrls;
    private String verificationStatus;
    private LocalDateTime createdAt;
}
