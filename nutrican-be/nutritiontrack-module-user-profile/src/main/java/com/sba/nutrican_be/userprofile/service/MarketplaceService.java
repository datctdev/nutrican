package com.sba.nutrican_be.userprofile.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.userprofile.dto.CreateReviewRequest;
import com.sba.nutrican_be.userprofile.dto.PtProfileResponse;
import com.sba.nutrican_be.userprofile.dto.PtSearchRequest;
import com.sba.nutrican_be.userprofile.dto.ReviewResponse;

import java.util.UUID;

public interface MarketplaceService {

    ApiResponse<PageResponse<PtProfileResponse>> searchPts(PtSearchRequest request);

    ApiResponse<PtProfileResponse> getPtDetail(UUID ptId);

    ApiResponse<PageResponse<ReviewResponse>> getPtReviews(UUID ptId, int page, int size);

    ApiResponse<ReviewResponse> createReview(UUID ptId, UUID reviewerId, CreateReviewRequest request);
}
