package com.sba.nutrican_be.core.entity;

import com.sba.nutrican_be.core.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_kyc")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
@ToString(exclude = {"user"})
public class UserKyc extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "id_card_number", length = 20)
    private String idCardNumber;

    @Column(name = "id_card_front_url", length = 500)
    private String idCardFrontUrl;

    @Column(name = "id_card_back_url", length = 500)
    private String idCardBackUrl;

    @Column(name = "full_name_on_card", length = 255)
    private String fullNameOnCard;

    @Column(name = "date_of_birth_on_card")
    private LocalDate dateOfBirthOnCard;

    @Column(name = "address_on_card", columnDefinition = "TEXT")
    private String addressOnCard;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 50)
    @Builder.Default
    private UserStatus verificationStatus = UserStatus.PENDING_APPROVAL;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;
}
