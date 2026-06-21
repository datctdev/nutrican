package com.sba.nutrican_be.core.entity;

import com.sba.nutrican_be.core.enums.UserRole;
import com.sba.nutrican_be.core.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

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
