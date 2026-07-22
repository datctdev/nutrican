package com.sba.nutricanbe.admin.service.impl;

import com.sba.nutricanbe.admin.dto.AdminDashboardDto;
import com.sba.nutricanbe.admin.service.AdminDashboardService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<AdminDashboardDto> getDashboardStats() {
        long totalUsers = userRepository.count();
        long totalPts = userRepository.findByRole(UserRole.PT_CERTIFIED, PageRequest.of(0, 1)).getTotalElements()
                + userRepository.findByRole(UserRole.PT_FREELANCE, PageRequest.of(0, 1)).getTotalElements();
        long totalCustomers = userRepository.findByRole(UserRole.CUSTOMER, PageRequest.of(0, 1)).getTotalElements();
        long pendingPts = ptProfileRepository.findByPtRequestStatus(
                UserStatus.PENDING_APPROVAL, PageRequest.of(0, 1)).getTotalElements();

        AdminDashboardDto stats = AdminDashboardDto.builder()
                .totalUsers(totalUsers)
                .totalCustomers(totalCustomers)
                .totalPts(totalPts)
                .pendingPtVerifications(pendingPts)
                .pendingKycVerifications(0)
                .totalDietLogs(0)
                .averageRating(BigDecimal.valueOf(4.5))
                .build();

        return ApiResponse.success(stats);
    }
}
