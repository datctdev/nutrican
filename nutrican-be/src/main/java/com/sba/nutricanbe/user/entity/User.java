package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.diet.enums.AllergenType;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(exclude = {"ptProfile", "macroTarget"})
public class User extends BaseEntity {

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "full_name", length = 255)
    private String fullName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "height_cm")
    private Integer heightCm;

    @Column(length = 10)
    private String gender;

    @Column(name = "onboarding_completed_at")
    private java.time.LocalDateTime onboardingCompletedAt;

    @Column(name = "onboarding_step")
    private Integer onboardingStep;

    @Column(name = "onboarding_skipped_at")
    private java.time.LocalDateTime onboardingSkippedAt;

    @Column(name = "google_id", unique = true)
    private String googleId;

    @Column(name = "password_set_required")
    @Builder.Default
    private Boolean passwordSetRequired = false;

    @Column(name = "google_picture_url", length = 500)
    private String googlePictureUrl;

    @Column(name = "is_kyc_verified")
    @Builder.Default
    private Boolean isKycVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "diet_preference", length = 20)
    @Builder.Default
    private DietPreference dietPreference = DietPreference.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "nutrition_goal", length = 20)
    private NutritionGoal nutritionGoal;

    @Column(name = "pregnancy_trimester")
    private Integer pregnancyTrimester;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allergic_food_codes", columnDefinition = "jsonb")
    private List<String> allergicFoodCodes;

    /** NFR-14: e.g. {"postMealRating": true} */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "notification_opt_in", columnDefinition = "jsonb")
    private Map<String, Boolean> notificationOptIn;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private PtProfile ptProfile;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private MacroTarget macroTarget;

    public static User createGoogleUser(String email, String googleId, String name, String picture) {
        return User.builder()
                .email(email)
                .googleId(googleId)
                .fullName(name)
                .avatarUrl(picture)
                .googlePictureUrl(picture)
                .role(UserRole.CUSTOMER)
                .status(UserStatus.PENDING_PASSWORD)
                .passwordSetRequired(true)
                .build();
    }

    public static User createWithPassword(String email, String passwordHash, String fullName, String phoneNumber) {
        return User.builder()
                .email(email)
                .passwordHash(passwordHash)
                .fullName(fullName)
                .phoneNumber(phoneNumber)
                .role(UserRole.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .passwordSetRequired(false)
                .build();
    }
}

