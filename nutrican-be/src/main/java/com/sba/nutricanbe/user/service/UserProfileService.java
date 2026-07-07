package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.user.dto.PtProfileSummary;
import com.sba.nutricanbe.user.dto.PtRegistrationRequest;
import com.sba.nutricanbe.user.dto.UpdateProfileRequest;
import com.sba.nutricanbe.user.dto.UserProfileResponse;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

public interface UserProfileService {

    ApiResponse<UserProfileResponse> getProfile(UUID userId);

    ApiResponse<UserProfileResponse> updateProfile(UUID userId, UpdateProfileRequest request);

    ApiResponse<String> uploadAvatar(UUID userId, MultipartFile file);

    ApiResponse<MacroTargetResponse> getMacroTarget(UUID userId);

    ApiResponse<MacroTargetResponse> setMacroTarget(UUID userId, MacroTargetRequest request);

    ApiResponse<PtProfileSummary> registerAsPt(UUID userId, PtRegistrationRequest request);

    ApiResponse<String> uploadCertImage(UUID userId, MultipartFile file);

    ApiResponse<String> uploadCv(UUID userId, MultipartFile file);

    ApiResponse<PtProfileSummary> resubmitPt(UUID userId, PtRegistrationRequest request);
}

