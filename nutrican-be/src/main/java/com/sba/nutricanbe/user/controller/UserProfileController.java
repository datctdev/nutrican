package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.user.dto.PtProfileSummary;
import com.sba.nutricanbe.user.dto.PtRegistrationRequest;
import com.sba.nutricanbe.user.dto.UpdateProfileRequest;
import com.sba.nutricanbe.user.dto.UserProfileResponse;
import com.sba.nutricanbe.user.service.UserProfileService;
import com.sba.nutricanbe.diet.service.DietLogHelper;
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
            @RequestBody com.sba.nutricanbe.user.dto.UpdatePtProfileRequest request) {
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
}

