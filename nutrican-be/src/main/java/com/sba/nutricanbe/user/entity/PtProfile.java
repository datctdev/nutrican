package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.user.dto.CertificationData;
import com.sba.nutricanbe.user.enums.Gender;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.common.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "pt_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(exclude = {"user"})
public class PtProfile extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;


    @Column(name = "preferred_track", length = 20)
    private String preferredTrack;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "training_philosophy", columnDefinition = "TEXT")
    private String trainingPhilosophy;


    @Column(name = "experience_start_date")
    private LocalDate experienceStartDate;


    public Integer getYearsOfExperience() {
        if (experienceStartDate == null) return 0;
        return (int) ChronoUnit.YEARS.between(experienceStartDate, LocalDate.now());
    }


    @Column(name = "contact_phone", length = 20)
    private String contactPhone;


    @Enumerated(EnumType.STRING)
    @Column(name = "training_mode", length = 20)
    private TrainingMode trainingMode;


    @Column(name = "location", length = 100)
    private String location;


    @Column(name = "online_rate", precision = 12, scale = 2)
    private BigDecimal onlineRate;

    @Column(name = "online_rate_unit", length = 20)
    private String onlineRateUnit;

    @Column(name = "offline_rate", precision = 12, scale = 2)
    private BigDecimal offlineRate;

    @Column(name = "offline_rate_unit", length = 20)
    private String offlineRateUnit;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "portfolio_showcase", columnDefinition = "jsonb")
    private Map<String, Object> portfolioShowcase;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "specializations", columnDefinition = "jsonb")
    private List<String> specializations;

    @Column(precision = 2, scale = 1)
    @Builder.Default
    private BigDecimal rating = BigDecimal.valueOf(5.0);

    @Column(name = "total_reviews")
    @Builder.Default
    private Integer totalReviews = 0;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private Tier tier = Tier.TIER_2;


    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "certifications", columnDefinition = "jsonb")
    private List<CertificationData> certifications;

    @Column(name = "cv_url", columnDefinition = "TEXT")
    private String cvUrl;

    @Column(name = "document_urls", columnDefinition = "TEXT")
    private String documentUrls;

    @Column(name = "instagram_url", length = 255)
    private String instagramUrl;

    @Column(name = "linkedin_url", length = 255)
    private String linkedinUrl;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(name = "admin_reject_note", columnDefinition = "TEXT")
    private String adminRejectNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "pt_request_status", length = 50)
    @Builder.Default
    private UserStatus ptRequestStatus = UserStatus.PENDING_APPROVAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 50)
    @Builder.Default
    private UserStatus verificationStatus = UserStatus.PENDING_APPROVAL;

    @Column(name = "max_clients")
    @Builder.Default
    private Integer maxClients = 10;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferred_goals", columnDefinition = "jsonb")
    private List<String> preferredGoals;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferred_diet_types", columnDefinition = "jsonb")
    private List<String> preferredDietTypes;
}
