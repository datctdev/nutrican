package com.sba.nutrican_be.userprofile.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtProfileResponse {
    private Long id;
    private Long userId;
    private String fullName;
    private String email;
    private String avatarUrl;
    private Boolean isVerified;
    private String bio;
    private String trainingPhilosophy;
    private Integer yearsOfExperience;
    private String[] specializations;
    private BigDecimal rating;
    private Integer totalReviews;
    private String tier;
    private BigDecimal hourlyRate;
}
