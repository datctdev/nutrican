package com.sba.nutricanbe.user.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.user.dto.PtProfileSummary;
import com.sba.nutricanbe.user.dto.PtRegistrationRequest;
import com.sba.nutricanbe.user.dto.UpdateProfileRequest;
import com.sba.nutricanbe.user.dto.UserProfileResponse;
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

    @PostMapping(value = "/pt/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadCv(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(userProfileService.uploadCv(user.getId(), file));
    }
}
