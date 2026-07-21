package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.dto.CreateReviewRequest;
import com.sba.nutricanbe.user.dto.PtProfileResponse;
import com.sba.nutricanbe.user.dto.PtSearchRequest;
import com.sba.nutricanbe.user.dto.ReviewResponse;
import com.sba.nutricanbe.user.entity.User;

import java.util.UUID;

public interface MarketplaceService {

    ApiResponse<PageResponse<PtProfileResponse>> searchPts(PtSearchRequest request, User customer);

    ApiResponse<PtProfileResponse> getPtDetail(UUID ptId, User user);

    ApiResponse<PageResponse<ReviewResponse>> getPtReviews(UUID ptId, int page, int size);

    ApiResponse<ReviewResponse> createReview(UUID ptId, UUID reviewerId, CreateReviewRequest request, org.springframework.web.multipart.MultipartFile image);

    ApiResponse<ReviewResponse> updateReview(UUID ptId, UUID reviewId, UUID reviewerId, CreateReviewRequest request, org.springframework.web.multipart.MultipartFile image);

    ApiResponse<Void> deleteReview(UUID ptId, UUID reviewId, UUID reviewerId);
}
