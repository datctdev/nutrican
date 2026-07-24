package com.sba.nutricanbe.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.sba.nutricanbe.user.enums.ActivityLevel;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.enums.NutritionGoal;

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
    private String allergyNotes;
    private DietPreference dietPreference;
    private NutritionGoal nutritionGoal;
    private ActivityLevel activityLevel;
    private Integer exerciseSessionsPerWeek;
    private Integer exerciseMinutesPerSession;
    private Integer pregnancyTrimester;
    private Integer heightCm;
    private String gender;
    private Map<String, Boolean> notificationOptIn;
}
