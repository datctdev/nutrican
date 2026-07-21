package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.dto.CreateReviewRequest;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;
import com.sba.nutricanbe.user.dto.PtProfileResponse;
import com.sba.nutricanbe.user.dto.PtSearchRequest;
import com.sba.nutricanbe.user.dto.ReviewResponse;
import com.sba.nutricanbe.user.dto.HirePtRequest;
import com.sba.nutricanbe.user.service.MarketplaceService;
import com.sba.nutricanbe.user.service.PtHireService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.sba.nutricanbe.user.dto.PtCalendarResponse;
import com.sba.nutricanbe.user.service.PtCalendarService;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

    private final MarketplaceService marketplaceService;
    private final PtHireService ptHireService;
    private final PtCalendarService ptCalendarService;

    @GetMapping("/pts")
    public ResponseEntity<ApiResponse<PageResponse<PtProfileResponse>>> searchPts(
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) Boolean verifiedOnly,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) String goalFilter,
            @RequestParam(required = false) String dietFilter,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "tier") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal User user) {

        PtSearchRequest request = new PtSearchRequest();
        request.setSpecialization(specialization);
        request.setMinExperience(minExperience);
        request.setVerifiedOnly(verifiedOnly);
        request.setTier(tier);
        request.setGoalFilter(goalFilter);
        request.setDietFilter(dietFilter);
        request.setSearch(search);
        request.setSort(sort);
        request.setSortBy(sortBy);
        request.setSortDir(sortDir);
        request.setPage(page);
        request.setSize(size);

        return ResponseEntity.ok(marketplaceService.searchPts(request, user));
    }

    @GetMapping("/pts/{ptId}")
    public ResponseEntity<ApiResponse<PtProfileResponse>> getPtDetail(
            @PathVariable UUID ptId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(marketplaceService.getPtDetail(ptId, user));
    }

    @GetMapping("/pts/{ptId}/calendar")
    public ResponseEntity<ApiResponse<PtCalendarResponse>> getPtCalendar(
            @PathVariable UUID ptId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {
        return ResponseEntity.ok(ptCalendarService.getCalendar(ptId, from, to));
    }

    @GetMapping("/pts/{ptId}/reviews")
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> getPtReviews(
            @PathVariable UUID ptId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(marketplaceService.getPtReviews(ptId, page, size));
    }

    @PostMapping(value = "/pts/{ptId}/reviews", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable UUID ptId,
            @AuthenticationPrincipal User user,
            @Valid @ModelAttribute CreateReviewRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image) {

        return ResponseEntity.ok(marketplaceService.createReview(ptId, user.getId(), request, image));
    }

    @PostMapping("/pts/{ptId}/hire")
    public ResponseEntity<ApiResponse<PtClientMappingResponse>> hirePt(
            @PathVariable UUID ptId,
            @Valid @RequestBody HirePtRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptHireService.hirePt(ptId, user.getId(), request));
    }

    @GetMapping("/hire-requests/open")
    public ResponseEntity<ApiResponse<PtClientMappingResponse>> getOpenHireRequest(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ptHireService.getOpenHireRequest(user.getId()));
    }

    @PutMapping(value = "/pts/{ptId}/reviews/{reviewId}", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @PathVariable UUID ptId,
            @PathVariable UUID reviewId,
            @AuthenticationPrincipal User user,
            @Valid @ModelAttribute CreateReviewRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return ResponseEntity.ok(marketplaceService.updateReview(ptId, reviewId, user.getId(), request, image));
    }

    @DeleteMapping("/pts/{ptId}/reviews/{reviewId}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable UUID ptId,
            @PathVariable UUID reviewId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(marketplaceService.deleteReview(ptId, reviewId, user.getId()));
    }
}
