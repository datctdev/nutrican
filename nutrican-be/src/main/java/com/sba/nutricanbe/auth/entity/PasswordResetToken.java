package com.sba.nutricanbe.auth.entity;

import java.util.UUID;
import com.sba.nutricanbe.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "password_reset_tokens")
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class PasswordResetToken extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token", unique = true, nullable = false, length = 64)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used", nullable = false)
    private Boolean used = false;

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
}
