package com.sba.nutrican_be.admin.service;

import com.sba.nutrican_be.admin.dto.AdminDashboardDto;
import com.sba.nutrican_be.admin.dto.PendingPtDto;
import com.sba.nutrican_be.admin.dto.PtVerificationRequest;
import com.sba.nutrican_be.admin.dto.UserAdminDto;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.SOSTicket;

import java.util.UUID;

public interface AdminService {

    ApiResponse<PageResponse<UserAdminDto>> getUsers(String role, String status, String search, int page, int size);

    ApiResponse<Void> updateUserStatus(UUID userId, String newStatus);

    ApiResponse<PageResponse<PendingPtDto>> getPendingPts(int page, int size);

    ApiResponse<Void> verifyPt(UUID userId, PtVerificationRequest request);

    ApiResponse<PageResponse<SOSTicket>> getSosTickets(String status, int page, int size);

    ApiResponse<Void> assignSosTicket(UUID ticketId, UUID ptId);

    ApiResponse<AdminDashboardDto> getDashboardStats();

}
