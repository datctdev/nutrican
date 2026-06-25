package com.sba.nutricanbe.userprofile.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtProfileSummary {
    private UUID id;
    private Boolean isVerified;
    private String bio;
    private String trainingPhilosophy;
    private Integer yearsOfExperience;
    private List<String> specializations;
    private BigDecimal rating;
    private Integer totalReviews;
    private String tier;
    private BigDecimal hourlyRate;
    private String ptRequestStatus;
    private String verificationStatus;
}
