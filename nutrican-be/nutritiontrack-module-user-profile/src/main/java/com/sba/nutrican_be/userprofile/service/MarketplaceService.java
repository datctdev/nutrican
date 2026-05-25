package com.sba.nutrican_be.userprofile.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.PtProfile;
import com.sba.nutrican_be.core.entity.Review;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.Tier;
import com.sba.nutrican_be.core.enums.UserRole;
import com.sba.nutrican_be.core.exception.BadRequestException;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.PtProfileRepository;
import com.sba.nutrican_be.core.repository.ReviewRepository;
import com.sba.nutrican_be.core.repository.UserRepository;
import com.sba.nutrican_be.userprofile.dto.CreateReviewRequest;
import com.sba.nutrican_be.userprofile.dto.PtProfileResponse;
import com.sba.nutrican_be.userprofile.dto.PtSearchRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketplaceService {

    private final PtProfileRepository ptProfileRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;

    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<PtProfileResponse>> searchPts(PtSearchRequest request) {
        Sort sort = request.getSortDir().equalsIgnoreCase("asc")
                ? Sort.by(request.getSortBy()).ascending()
                : Sort.by(request.getSortBy()).descending();
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), sort);

        Page<PtProfile> page;
        if (request.getVerifiedOnly() != null && request.getVerifiedOnly()) {
            if (request.getTier() != null) {
                page = ptProfileRepository.findByIsVerifiedTrueAndTier(Tier.valueOf(request.getTier()), pageable);
            } else {
                page = ptProfileRepository.findByIsVerifiedTrue(pageable);
            }
        } else {
            page = ptProfileRepository.findAll(pageable);
        }

        Page<PtProfileResponse> mapped = page.map(this::toPtProfileResponse);
        return ApiResponse.success(PageResponse.from(mapped));
    }

    @Transactional(readOnly = true)
    public ApiResponse<PtProfileResponse> getPtDetail(Long ptId) {
        PtProfile profile = ptProfileRepository.findByIdWithUser(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));
        return ApiResponse.success(toPtProfileResponse(profile));
    }

    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<ReviewResponse>> getPtReviews(Long ptId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Review> reviewPage = reviewRepository.findByPtId(ptId, pageable);
        Page<ReviewResponse> mapped = reviewPage.map(this::toReviewResponse);
        return ApiResponse.success(PageResponse.from(mapped));
    }

    @Transactional
    public ApiResponse<ReviewResponse> createReview(Long ptId, Long reviewerId, CreateReviewRequest request) {
        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        if (pt.getRole() != UserRole.PT_CERTIFIED && pt.getRole() != UserRole.PT_FREELANCE) {
            throw new BadRequestException("User is not a PT");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer", reviewerId));

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
        return ApiResponse.success(toReviewResponse(review), "Review submitted successfully");
    }

    private PtProfileResponse toPtProfileResponse(PtProfile profile) {
        User user = profile.getUser();
        return PtProfileResponse.builder()
                .id(profile.getId())
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .isVerified(profile.getIsVerified())
                .bio(profile.getBio())
                .trainingPhilosophy(profile.getTrainingPhilosophy())
                .yearsOfExperience(profile.getYearsOfExperience())
                .specializations(profile.getSpecializations())
                .rating(profile.getRating())
                .totalReviews(profile.getTotalReviews())
                .tier(profile.getTier().name())
                .hourlyRate(profile.getHourlyRate())
                .build();
    }

    private ReviewResponse toReviewResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .ptId(review.getPt().getId())
                .reviewerId(review.getReviewer().getId())
                .reviewerName(review.getReviewer().getFullName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ReviewResponse {
        private Long id;
        private Long ptId;
        private Long reviewerId;
        private String reviewerName;
        private Double rating;
        private String comment;
        private java.time.LocalDateTime createdAt;
    }
}
