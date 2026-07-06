package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import com.sba.nutricanbe.user.dto.CertificationData;
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

    /** Hướng đăng ký mong muốn do user chọn: CERTIFIED hoặc FREELANCE */
    @Column(name = "preferred_track", length = 20)
    private String preferredTrack;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "training_philosophy", columnDefinition = "TEXT")
    private String trainingPhilosophy;

    /** Ngày bắt đầu hoạt động làm PT — hệ thống tự tính số năm kinh nghiệm */
    @Column(name = "experience_start_date")
    private LocalDate experienceStartDate;

    /** Computed: số năm kinh nghiệm tính từ experienceStartDate đến ngày hiện tại */
    public Integer getYearsOfExperience() {
        if (experienceStartDate == null) return 0;
        return (int) ChronoUnit.YEARS.between(experienceStartDate, LocalDate.now());
    }

    /** Số điện thoại liên hệ riêng của PT (có thể khác số tài khoản) */
    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    /** Hình thức huấn luyện: ONLINE / OFFLINE / BOTH */
    @Enumerated(EnumType.STRING)
    @Column(name = "training_mode", length = 20)
    private TrainingMode trainingMode;

    /** Địa điểm hoạt động chính, VD: "TP. Hồ Chí Minh" */
    @Column(name = "location", length = 100)
    private String location;

    /** Đơn vị tính phí: HOUR | SESSION_60 | SESSION_90 | MONTH */
    @Column(name = "rate_unit", length = 20)
    private String rateUnit;

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

    /** Danh sách chứng chỉ chuyên môn (JSONB) — mỗi chứng chỉ có ảnh xác minh */
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
    @Column(name = "pt_request_status", length = 50)
    @Builder.Default
    private UserStatus ptRequestStatus = UserStatus.PENDING_APPROVAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 50)
    @Builder.Default
    private UserStatus verificationStatus = UserStatus.PENDING_APPROVAL;
}
