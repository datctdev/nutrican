package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.Review;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.ReviewRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.dto.CreateReviewRequest;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;
import com.sba.nutricanbe.user.dto.PtProfileResponse;
import com.sba.nutricanbe.user.dto.PtSearchRequest;
import com.sba.nutricanbe.user.dto.ReviewResponse;
import com.sba.nutricanbe.user.service.MarketplaceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketplaceServiceImpl implements MarketplaceService {

    private final PtProfileRepository ptProfileRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final PtClientMappingRepository mappingRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<PtProfileResponse>> searchPts(PtSearchRequest request) {
        Sort sort = request.getSortDir().equalsIgnoreCase("asc")
                ? Sort.by(request.getSortBy()).ascending()
                : Sort.by(request.getSortBy()).descending();
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), sort);

        Page<PtProfile> page;
        if (Boolean.TRUE.equals(request.getVerifiedOnly())) {
            page = request.getTier() != null
                    ? ptProfileRepository.findByIsVerifiedTrueAndTier(Tier.valueOf(request.getTier()), pageable)
                    : ptProfileRepository.findByIsVerifiedTrue(pageable);
        } else {
            page = ptProfileRepository.findAll(pageable);
        }

        return ApiResponse.success(PageResponse.from(page.map(PtProfileResponse::toPtProfileResponse)));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtProfileResponse> getPtDetail(UUID ptId, User user) {
        PtProfile profile = ptProfileRepository.findByIdWithUser(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));

        PtProfileResponse response = PtProfileResponse.toPtProfileResponse(profile);

        if (user != null && user.getRole() == UserRole.CUSTOMER) {
            mappingRepository.findByPt_IdAndClient_Id(profile.getUser().getId(), user.getId())
                    .ifPresent(mapping -> response.setMappingStatus(mapping.getStatus().name()));
        }

        return ApiResponse.success(response);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<ReviewResponse>> getPtReviews(UUID ptId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Review> reviewPage = reviewRepository.findByPtId(ptId, pageable);
        return ApiResponse.success(PageResponse.from(reviewPage.map(ReviewResponse::toReviewResponse)));
    }

    @Override
    @Transactional
    public ApiResponse<ReviewResponse> createReview(UUID ptId, UUID reviewerId, CreateReviewRequest request) {
        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        if (pt.getRole() != UserRole.PT_CERTIFIED && pt.getRole() != UserRole.PT_FREELANCE) {
            throw new BadRequestException("User is not a PT");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer", reviewerId));

        boolean hasHired = mappingRepository.findByPt_IdAndClient_Id(ptId, reviewerId)
                .map(m -> m.getStatus() == ClientMappingStatus.ACTIVE || m.getStatus() == ClientMappingStatus.INACTIVE)
                .orElse(false);

        if (!hasHired) {
            throw new BadRequestException("Bạn chỉ có thể đánh giá Huấn luyện viên mà bạn đã từng làm việc cùng.");
        }

        Review review = Review.builder()
                .pt(pt)
                .reviewer(reviewer)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        review = reviewRepository.save(review);

        PtProfile profile = ptProfileRepository.findByUserId(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));

        Double avgRating = reviewRepository.findAverageRatingByPtId(ptId);
        profile.setRating(avgRating != null ? BigDecimal.valueOf(avgRating) : BigDecimal.valueOf(5.0));
        profile.setTotalReviews((int) reviewRepository.countByPtId(ptId));
        ptProfileRepository.save(profile);

        log.info("Review created for PT: {} by user: {}", ptId, reviewerId);
        return ApiResponse.success(ReviewResponse.toReviewResponse(review), "Review submitted successfully");
    }

    @Override
    @Transactional
    public ApiResponse<PtClientMappingResponse> hirePt(UUID ptId, UUID customerId) {
        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));
        if (pt.getRole() != UserRole.PT_CERTIFIED && pt.getRole() != UserRole.PT_FREELANCE) {
            throw new BadRequestException("User is not a PT");
        }

        PtProfile profile = ptProfileRepository.findByUserId(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));
        if (!Boolean.TRUE.equals(profile.getIsVerified())) {
            throw new BadRequestException("PT must be verified before accepting clients");
        }

        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", customerId));
        if (customer.getRole() != UserRole.CUSTOMER) {
            throw new BadRequestException("Only customers can hire a PT");
        }
        if (pt.getId().equals(customer.getId())) {
            throw new BadRequestException("You cannot hire yourself");
        }

        PtClientMapping mapping = mappingRepository.findByPt_IdAndClient_Id(ptId, customerId)
                .map(existing -> {
                    if (existing.getStatus() == ClientMappingStatus.ACTIVE) {
                        throw new BadRequestException("Bạn đã liên kết với Huấn luyện viên này rồi.");
                    }
                    if (existing.getStatus() == ClientMappingStatus.PENDING) {
                        throw new BadRequestException("Bạn đã gửi yêu cầu trước đó, vui lòng chờ PT xác nhận.");
                    }

                    existing.setStatus(ClientMappingStatus.PENDING);
                    return existing;
                })
                .orElseGet(() -> PtClientMapping.builder()
                        .pt(pt)
                        .client(customer)
                        .status(ClientMappingStatus.PENDING)
                        .build());

        mapping = mappingRepository.save(mapping);
        return ApiResponse.success(PtClientMappingResponse.toMappingResponse(mapping), "Hiring request sent");
    }

    @Override
    @Transactional
    public ApiResponse<PtClientMappingResponse> updateHireRequest(UUID clientId, UUID ptId, String action) {
        PtClientMapping mapping = mappingRepository.findByPt_IdAndClient_Id(ptId, clientId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", clientId));

        if (mapping.getStatus() != ClientMappingStatus.PENDING) {
            throw new BadRequestException("Only pending hiring requests can be updated");
        }

        String normalized = action != null ? action.trim().toUpperCase() : "";
        switch (normalized) {
            case "ACCEPT" -> mapping.setStatus(ClientMappingStatus.ACTIVE);
            case "REJECT", "DECLINE" -> mapping.setStatus(ClientMappingStatus.INACTIVE);
            default -> throw new BadRequestException("Invalid action: " + action);
        }

        mapping = mappingRepository.save(mapping);
        String message = mapping.getStatus() == ClientMappingStatus.ACTIVE
                ? "Hiring request accepted" : "Hiring request rejected";
        return ApiResponse.success(PtClientMappingResponse.toMappingResponse(mapping), message);
    }
}
