package com.sba.nutrican_be.admin.service;

import com.sba.nutrican_be.admin.dto.AdminDashboardDto;
import com.sba.nutrican_be.admin.dto.PendingPtDto;
import com.sba.nutrican_be.admin.dto.PtVerificationRequest;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.PtProfile;
import com.sba.nutrican_be.core.entity.SOSTicket;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.SOSTicketStatus;
import com.sba.nutrican_be.core.enums.Tier;
import com.sba.nutrican_be.core.enums.UserRole;
import com.sba.nutrican_be.core.enums.UserStatus;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final SOSTicketRepository sosTicketRepository;
    private final ReviewRepository reviewRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<User>> getUsers(String role, String status, String search, int page, int size) {
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

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<PendingPtDto>> getPendingPts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<PtProfile> profilePage = ptProfileRepository.findByVerificationStatus(
                UserStatus.PENDING_APPROVAL, pageable);

        return ApiResponse.success(PageResponse.from(profilePage.map(this::toPendingPtDto)));
    }

    @Override
    @Transactional
    public ApiResponse<Void> verifyPt(UUID userId, PtVerificationRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PtProfile profile = ptProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile for user", userId));

        switch (request.getAction().toUpperCase()) {
            case "APPROVE" -> {
                if ("CERTIFIED".equalsIgnoreCase(request.getPtType())) {
                    user.setRole(UserRole.PT_CERTIFIED);
                    profile.setIsVerified(true);
                    profile.setTier(Tier.TIER_1);
                } else if ("FREELANCE".equalsIgnoreCase(request.getPtType())) {
                    user.setRole(UserRole.PT_FREELANCE);
                    profile.setIsVerified(true);
                    profile.setTier(Tier.TIER_2);
                }
                user.setStatus(UserStatus.ACTIVE);
                profile.setVerificationStatus(UserStatus.ACTIVE);
                log.info("PT {} approved as {} by admin", userId, request.getPtType());
            }
            case "REJECT" -> {
                user.setStatus(UserStatus.SUSPENDED);
                profile.setVerificationStatus(UserStatus.SUSPENDED);
                profile.setIsVerified(false);
                log.info("PT {} rejected by admin", userId);
            }
            default -> throw new BadRequestException("Invalid action: " + request.getAction());
        }

        userRepository.save(user);
        ptProfileRepository.save(profile);

        return ApiResponse.success(null, "PT verification processed");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<SOSTicket>> getSosTickets(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<SOSTicket> ticketPage;

        if (status != null) {
            ticketPage = sosTicketRepository.findByStatus(SOSTicketStatus.valueOf(status), pageable);
        } else {
            ticketPage = sosTicketRepository.findByStatusIn(
                    List.of(SOSTicketStatus.OPEN, SOSTicketStatus.ASSIGNED), pageable);
        }

        return ApiResponse.success(PageResponse.from(ticketPage));
    }

    @Override
    @Transactional
    public ApiResponse<Void> assignSosTicket(UUID ticketId, UUID ptId) {
        SOSTicket ticket = sosTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("SOS Ticket", ticketId));

        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        if (pt.getRole() != UserRole.PT_CERTIFIED && pt.getRole() != UserRole.PT_FREELANCE) {
            throw new BadRequestException("User is not a PT");
        }

        ticket.setPt(pt);
        ticket.setStatus(SOSTicketStatus.ASSIGNED);
        sosTicketRepository.save(ticket);

        log.info("SOS ticket {} assigned to PT {}", ticketId, ptId);
        return ApiResponse.success(null, "SOS ticket assigned");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<AdminDashboardDto> getDashboardStats() {
        long totalUsers = userRepository.count();
        long totalPts = userRepository.findByRole(UserRole.PT_CERTIFIED, PageRequest.of(0, 1)).getTotalElements()
                + userRepository.findByRole(UserRole.PT_FREELANCE, PageRequest.of(0, 1)).getTotalElements();
        long totalCustomers = userRepository.findByRole(UserRole.CUSTOMER, PageRequest.of(0, 1)).getTotalElements();
        long pendingPts = ptProfileRepository.findByVerificationStatus(
                UserStatus.PENDING_APPROVAL, PageRequest.of(0, 1)).getTotalElements();
        long activeSos = sosTicketRepository.findByStatus(
                SOSTicketStatus.OPEN, PageRequest.of(0, 1)).getTotalElements();

        AdminDashboardDto stats = AdminDashboardDto.builder()
                .totalUsers(totalUsers)
                .totalCustomers(totalCustomers)
                .totalPts(totalPts)
                .pendingPtVerifications(pendingPts)
                .activeSosTickets(activeSos)
                .totalDietLogs(0)
                .averageRating(BigDecimal.valueOf(4.5))
                .build();

        return ApiResponse.success(stats);
    }

    private PendingPtDto toPendingPtDto(PtProfile profile) {
        User user = profile.getUser();
        return PendingPtDto.builder()
                .id(profile.getId())
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .bio(profile.getBio())
                .trainingPhilosophy(profile.getTrainingPhilosophy())
                .yearsOfExperience(profile.getYearsOfExperience())
                .certifications(profile.getCertifications())
                .cvUrl(profile.getCvUrl())
                .documentUrls(profile.getDocumentUrls())
                .verificationStatus(profile.getVerificationStatus().name())
                .createdAt(profile.getCreatedAt())
                .build();
    }
}
