package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.diet.service.DietLogHelper;
import com.sba.nutricanbe.user.dto.*;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.service.PtVenueAvailabilityService;
import com.sba.nutricanbe.user.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final PtVenueAvailabilityService venueAvailabilityService;
    private final DietLogHelper dietLogHelper;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userProfileService.getProfile(user.getId()));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userProfileService.updateProfile(user.getId(), request));
    }

    @PutMapping("/pt")
    public ResponseEntity<ApiResponse<PtProfileSummary>> updateMyPtProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdatePtProfileRequest request) {
        return ResponseEntity.ok(userProfileService.updatePtProfile(user.getId(), request));
    }

    @PutMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadAvatar(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userProfileService.uploadAvatar(user.getId(), file));
    }

    @GetMapping("/macro-target")
    public ResponseEntity<ApiResponse<MacroTargetResponse>> getMacroTarget(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userProfileService.getMacroTarget(user.getId()));
    }

    @PutMapping("/macro-target")
    public ResponseEntity<ApiResponse<MacroTargetResponse>> setMacroTarget(
            @AuthenticationPrincipal User user,
            @RequestBody MacroTargetRequest request) {
        if (dietLogHelper.hasActivePt(user.getId())) {
            throw new BadRequestException(
                    "Mục tiêu dinh dưỡng đang do PT quản lý — liên hệ PT để thay đổi macro");
        }
        return ResponseEntity.ok(userProfileService.setMacroTarget(user.getId(), request));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getPublicProfile(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(userProfileService.getProfile(userId));
    }

    @PostMapping("/pt/register")
    public ResponseEntity<ApiResponse<PtProfileSummary>> registerAsPt(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PtRegistrationRequest request) {
        return ResponseEntity.ok(userProfileService.registerAsPt(user.getId(), request));
    }

    @PutMapping("/pt/resubmit")
    public ResponseEntity<ApiResponse<PtProfileSummary>> resubmitPt(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PtRegistrationRequest request) {
        return ResponseEntity.ok(userProfileService.resubmitPt(user.getId(), request));
    }

    @PostMapping(value = "/pt/cert-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadCertImage(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userProfileService.uploadCertImage(user.getId(), file));
    }

    @PostMapping(value = "/pt/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadCv(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userProfileService.uploadCv(user.getId(), file));
    }

    @PostMapping(value = "/pt/portfolio-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadPortfolioImage(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userProfileService.uploadPortfolioImage(user.getId(), file));
    }

    @GetMapping("/pt/venues")
    public ResponseEntity<ApiResponse<java.util.List<PtVenueResponse>>> listVenues(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(venueAvailabilityService.listVenues(user.getId()));
    }

    @PostMapping("/pt/venues")
    public ResponseEntity<ApiResponse<PtVenueResponse>> createVenue(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PtVenueRequest request) {
        return ResponseEntity.ok(venueAvailabilityService.createVenue(user.getId(), request));
    }

    @PutMapping("/pt/venues/{venueId}")
    public ResponseEntity<ApiResponse<PtVenueResponse>> updateVenue(
            @AuthenticationPrincipal User user,
            @PathVariable UUID venueId,
            @Valid @RequestBody PtVenueRequest request) {
        return ResponseEntity.ok(venueAvailabilityService.updateVenue(user.getId(), venueId, request));
    }

    @DeleteMapping("/pt/venues/{venueId}")
    public ResponseEntity<ApiResponse<PtVenueResponse>> deactivateVenue(
            @AuthenticationPrincipal User user,
            @PathVariable UUID venueId) {
        return ResponseEntity.ok(venueAvailabilityService.deactivateVenue(user.getId(), venueId));
    }

    @GetMapping("/pt/availability")
    public ResponseEntity<ApiResponse<java.util.List<PtAvailabilityWindowResponse>>> getAvailability(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(venueAvailabilityService.getAvailability(user.getId()));
    }

    @PutMapping("/pt/availability")
    public ResponseEntity<ApiResponse<java.util.List<PtAvailabilityWindowResponse>>> replaceAvailability(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdatePtAvailabilityRequest request) {
        return ResponseEntity.ok(venueAvailabilityService.replaceAvailability(user.getId(), request));
    }

    @PostMapping("/pt/update-request")
    public ResponseEntity<ApiResponse<PtUpdateRequestDto>> submitPtUpdateRequest(
            @AuthenticationPrincipal User user,
            @RequestBody SubmitPtUpdateRequest request) {
        return ResponseEntity.ok(userProfileService.submitPtUpdateRequest(user.getId(), request));
    }

    @GetMapping("/pt/update-request/pending")
    public ResponseEntity<ApiResponse<PtUpdateRequestDto>> getPendingPtUpdateRequest(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(userProfileService.getPendingPtUpdateRequest(user.getId()));
    }
}
