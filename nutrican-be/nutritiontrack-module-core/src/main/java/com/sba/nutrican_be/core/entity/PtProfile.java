package com.sba.nutrican_be.core.entity;

import com.sba.nutrican_be.core.enums.Tier;
import com.sba.nutrican_be.core.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "pt_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"user"})
public class PtProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

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
    private String[] specializations;

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

    @Column(name = "cv_url", length = 500)
    private String cvUrl;

    @Column(name = "document_urls", columnDefinition = "TEXT")
    private String documentUrls;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 50)
    @Builder.Default
    private UserStatus verificationStatus = UserStatus.PENDING_APPROVAL;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
