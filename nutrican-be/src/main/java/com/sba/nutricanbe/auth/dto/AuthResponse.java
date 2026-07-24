package com.sba.nutricanbe.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private UserInfo user;
    /** True when account has no password yet — UI may suggest set-password (not a hard gate). */
    private boolean requiresPasswordSetup;
    /** Alias for clearer FE: same as requiresPasswordSetup when !hasPassword. */
    private boolean suggestPasswordSetup;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private UUID id;
        private String email;
        private String fullName;
        private String role;
        private String avatarUrl;
        private Boolean isKycVerified;
        private Boolean passwordSetRequired;
        private Boolean hasPassword;
    }
}
