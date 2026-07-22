package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.TrainingMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
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
    private TrainingMode trainingMode;
    private String location;
    private BigDecimal onlineRate;
    private String onlineRateUnit;
    private BigDecimal offlineRate;
    private String offlineRateUnit;
    private String mappingStatus;
    private UUID mappingId;
    private String selectedTrainingMode;
    private BigDecimal agreedAmount;
    private String agreedRateUnit;
    private java.time.LocalDateTime paymentDueAt;
    private Integer maxClients;
    private Long activeClientCount;
    private Boolean slotsAvailable;
    private List<String> preferredGoals;
    private List<String> preferredDietTypes;
    private Boolean goalMatch;
    private Boolean dietMatch;

    private Map<String, Object> portfolioShowcase;
    private List<CertificationData> certifications;
    private String instagramUrl;
    private String linkedinUrl;

    private List<PtVenueResponse> venues;
    private List<PtAvailabilityWindowResponse> availability;


    private UUID venueId;
    private String venueName;
    private String venueAddress;
    private String venueMapsUrl;
    private java.time.LocalDateTime firstSessionStart;
    private java.time.LocalDateTime firstSessionEnd;

    private Integer sessionCount;
    private java.math.BigDecimal perSessionAmount;
    private List<MappingSessionResponse> sessions;

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
                .trainingMode(profile.getTrainingMode())
                .location(profile.getLocation())
                .onlineRate(profile.getOnlineRate())
                .onlineRateUnit(profile.getOnlineRateUnit())
                .offlineRate(profile.getOfflineRate())
                .offlineRateUnit(profile.getOfflineRateUnit())
                .maxClients(profile.getMaxClients())
                .preferredGoals(profile.getPreferredGoals())
                .preferredDietTypes(profile.getPreferredDietTypes())
                .build();
    }
}
