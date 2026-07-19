package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.TrainingMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtProfileSummary {
    private UUID id;
    private Boolean isVerified;
    private String preferredTrack;
    private String bio;
    private String trainingPhilosophy;
    private LocalDate experienceStartDate;
    private Integer yearsOfExperience;
    private String contactPhone;
    private TrainingMode trainingMode;
    private String location;
    private BigDecimal onlineRate;
    private String onlineRateUnit;
    private BigDecimal offlineRate;
    private String offlineRateUnit;
    private List<String> specializations;
    private List<CertificationData> certifications;
    private Map<String, Object> portfolioShowcase;
    private BigDecimal rating;
    private Integer totalReviews;
    private String tier;
    private String cvUrl;
    private String instagramUrl;
    private String linkedinUrl;
    private String gender;
    private String adminRejectNote;
    private String ptRequestStatus;
    private String verificationStatus;
}
