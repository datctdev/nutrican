package com.sba.nutricanbe.userprofile.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.userprofile.dto.CreateReviewRequest;
import com.sba.nutricanbe.userprofile.dto.PtProfileResponse;
import com.sba.nutricanbe.userprofile.dto.PtSearchRequest;
import com.sba.nutricanbe.userprofile.dto.ReviewResponse;

import java.util.UUID;

public interface MarketplaceService {

    ApiResponse<PageResponse<PtProfileResponse>> searchPts(PtSearchRequest request);

    ApiResponse<PtProfileResponse> getPtDetail(UUID ptId);

    ApiResponse<PageResponse<ReviewResponse>> getPtReviews(UUID ptId, int page, int size);

    ApiResponse<ReviewResponse> createReview(UUID ptId, UUID reviewerId, CreateReviewRequest request);
}
