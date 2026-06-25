package com.sba.nutricanbe.admin.service;

import com.sba.nutricanbe.admin.dto.UserAdminDto;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;

import java.util.UUID;

public interface UserAdminService {

    ApiResponse<PageResponse<UserAdminDto>> getUsers(String role, String status, String search, int page, int size);

    ApiResponse<Void> updateUserStatus(UUID userId, String newStatus);
}
