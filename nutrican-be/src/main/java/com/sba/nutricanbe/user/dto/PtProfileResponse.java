package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
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
    private String mappingStatus;
    private Integer maxClients;
    private Long activeClientCount;
    private Boolean slotsAvailable;
    private List<String> preferredGoals;
    private List<String> preferredDietTypes;
    private Boolean goalMatch;
    private Boolean dietMatch;

    public static PtProfileResponse toPtProfileResponse(PtProfile profile) {
        User user = profile.getUser();
        return PtProfileResponse.builder()
                .id(profile.getId())
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .isVerified(profile.getIsVerified())
                .bio(profile.getBio())
                .trainingPhilosophy(profile.getTrainingPhilosophy())
                .yearsOfExperience(profile.getYearsOfExperience())
                .specializations(profile.getSpecializations())
                .rating(profile.getRating())
                .totalReviews(profile.getTotalReviews())
                .tier(profile.getTier().name())
                .hourlyRate(profile.getHourlyRate())
                .maxClients(profile.getMaxClients())
                .preferredGoals(profile.getPreferredGoals())
                .preferredDietTypes(profile.getPreferredDietTypes())
                .build();
    }
}
