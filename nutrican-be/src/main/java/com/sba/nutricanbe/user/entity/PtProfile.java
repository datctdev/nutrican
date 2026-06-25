package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;

import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.common.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
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

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "training_philosophy", columnDefinition = "TEXT")
    private String trainingPhilosophy;

    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

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

    @Column(name = "hourly_rate", precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    @Column(name = "certifications", columnDefinition = "TEXT")
    private String certifications;

    @Column(name = "cv_url", columnDefinition = "TEXT")
    private String cvUrl;

    @Column(name = "document_urls", columnDefinition = "TEXT")
    private String documentUrls;

    @Enumerated(EnumType.STRING)
    @Column(name = "pt_request_status", length = 50)
    @Builder.Default
    private UserStatus ptRequestStatus = UserStatus.PENDING_APPROVAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 50)
    @Builder.Default
    private UserStatus verificationStatus = UserStatus.PENDING_APPROVAL;
}

