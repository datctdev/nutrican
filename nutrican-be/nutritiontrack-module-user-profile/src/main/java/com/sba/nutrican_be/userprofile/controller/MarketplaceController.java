package com.sba.nutrican_be.userprofile.controller;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.userprofile.dto.CreateReviewRequest;
import com.sba.nutrican_be.userprofile.dto.PtProfileResponse;
import com.sba.nutrican_be.userprofile.dto.PtSearchRequest;
import com.sba.nutrican_be.userprofile.dto.ReviewResponse;
import com.sba.nutrican_be.userprofile.service.MarketplaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

    private final MarketplaceService marketplaceService;

    @GetMapping("/pts")
    public ResponseEntity<ApiResponse<PageResponse<PtProfileResponse>>> searchPts(
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) Boolean verifiedOnly,
            @RequestParam(required = false) String tier,
            @RequestParam(defaultValue = "tier") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        PtSearchRequest request = new PtSearchRequest();
        request.setSpecialization(specialization);
        request.setMinExperience(minExperience);
        request.setVerifiedOnly(verifiedOnly);
        request.setTier(tier);
        request.setSortBy(sortBy);
        request.setSortDir(sortDir);
        request.setPage(page);
        request.setSize(size);

        return ResponseEntity.ok(marketplaceService.searchPts(request));
    }

    @GetMapping("/pts/{ptId}")
    public ResponseEntity<ApiResponse<PtProfileResponse>> getPtDetail(@PathVariable UUID ptId) {
        return ResponseEntity.ok(marketplaceService.getPtDetail(ptId));
    }

    @GetMapping("/pts/{ptId}/reviews")
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> getPtReviews(
            @PathVariable UUID ptId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(marketplaceService.getPtReviews(ptId, page, size));
    }

    @PostMapping("/pts/{ptId}/reviews")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable UUID ptId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateReviewRequest request) {
        return ResponseEntity.ok(marketplaceService.createReview(ptId, user.getId(), request));
    }
}
