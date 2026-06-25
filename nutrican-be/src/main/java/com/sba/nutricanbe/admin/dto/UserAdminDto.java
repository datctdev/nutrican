package com.sba.nutricanbe.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAdminDto {
    private String id;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String phoneNumber;
    private String address;
    private String role;
    private String status;
    private Boolean isKycVerified;
    private LocalDateTime createdAt;
}
