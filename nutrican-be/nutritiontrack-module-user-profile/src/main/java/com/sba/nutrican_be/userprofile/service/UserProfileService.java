package com.sba.nutrican_be.userprofile.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.userprofile.dto.MacroTargetRequest;
import com.sba.nutrican_be.userprofile.dto.MacroTargetResponse;
import com.sba.nutrican_be.userprofile.dto.UpdateProfileRequest;
import com.sba.nutrican_be.userprofile.dto.UserProfileResponse;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

public interface UserProfileService {

    ApiResponse<UserProfileResponse> getProfile(UUID userId);

    ApiResponse<UserProfileResponse> updateProfile(UUID userId, UpdateProfileRequest request);

    ApiResponse<String> uploadAvatar(UUID userId, MultipartFile file);

    ApiResponse<MacroTargetResponse> getMacroTarget(UUID userId);

    ApiResponse<MacroTargetResponse> setMacroTarget(UUID userId, MacroTargetRequest request);
}
