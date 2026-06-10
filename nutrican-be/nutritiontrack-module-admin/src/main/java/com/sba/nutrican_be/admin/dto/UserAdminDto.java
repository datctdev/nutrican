package com.sba.nutrican_be.admin.dto;

import com.sba.nutrican_be.core.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAdminDto {
    private UUID id;
    private String email;
    private String fullName;
    private String role;
    private String status;
    private String avatarUrl;
    private LocalDateTime createdAt;

    // Helper method để map từ Entity sang DTO
    public static UserAdminDto fromEntity(User user) {
        if (user == null) return null;
        return UserAdminDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .avatarUrl(user.getAvatarUrl())
                .createdAt(user.getCreatedAt())
                .build();
    }
}