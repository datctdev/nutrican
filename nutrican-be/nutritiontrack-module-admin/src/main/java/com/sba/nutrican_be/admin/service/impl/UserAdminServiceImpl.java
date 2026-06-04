package com.sba.nutrican_be.admin.service.impl;

import com.sba.nutrican_be.admin.service.UserAdminService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.UserRole;
import com.sba.nutrican_be.core.enums.UserStatus;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.UserRepository;
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
    public ApiResponse<PageResponse<User>> getUsers(
            String role, String status, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> userPage;

        if (role != null && status != null) {
            userPage = userRepository.findByRoleAndStatus(
                    UserRole.valueOf(role), UserStatus.valueOf(status), pageable);
        } else if (role != null) {
            userPage = userRepository.findByRole(UserRole.valueOf(role), pageable);
        } else {
            userPage = userRepository.findAll(pageable);
        }

        return ApiResponse.success(PageResponse.from(userPage));
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
}
