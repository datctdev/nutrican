package com.sba.nutricanbe.user.dto;

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
public class PtProfileResponse {
    private UUID id;
    private UUID userId;
    private String fullName;
    private String email;
    private String avatarUrl;
    private Boolean isVerified;
    private String bio;
    private String trainingPhilosophy;
    private Integer yearsOfExperience;
    private List<String> specializations;
    private BigDecimal rating;
    private Integer totalReviews;
    private String tier;
    private BigDecimal hourlyRate;
}
