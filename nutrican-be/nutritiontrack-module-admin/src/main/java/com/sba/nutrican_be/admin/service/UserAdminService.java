package com.sba.nutrican_be.admin.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.User;

import java.util.UUID;

public interface UserAdminService {

    ApiResponse<PageResponse<User>> getUsers(String role, String status, String search, int page, int size);

    ApiResponse<Void> updateUserStatus(UUID userId, String newStatus);
}
