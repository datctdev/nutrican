package com.sba.nutricanbe.admin.service.impl;

import com.sba.nutricanbe.admin.dto.UserAdminDto;
import com.sba.nutricanbe.admin.service.UserAdminService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserAdminServiceImpl implements UserAdminService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<UserAdminDto>> getUsers(
            String role, String status, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> userPage;

        if (role != null && status != null) {
            userPage = userRepository.findByRoleAndStatus(
                    UserRole.valueOf(role), UserStatus.valueOf(status), pageable);
        } else if (role != null) {
            userPage = userRepository.findByRole(UserRole.valueOf(role), pageable);
        } else if (status != null) {
            userPage = userRepository.findByStatus(UserStatus.valueOf(status), pageable);
        } else if (search != null && !search.isBlank()) {
            userPage = userRepository.findBySearch(search, pageable);
        } else {
            userPage = userRepository.findAll(pageable);
        }

        Page<UserAdminDto> dtoPage = userPage.map(this::toDto);
        return ApiResponse.success(PageResponse.from(dtoPage));
    }

    @Override
    @Transactional
    public ApiResponse<Void> updateUserStatus(UUID userId, String newStatus) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        user.setStatus(UserStatus.valueOf(newStatus));
        userRepository.save(user);
        log.info("User {} status updated to {}", userId, newStatus);
        return ApiResponse.success(null, "User status updated");
    }

    private UserAdminDto toDto(User user) {
        return UserAdminDto.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .phoneNumber(user.getPhoneNumber())
                .address(user.getAddress())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .isKycVerified(user.getIsKycVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
