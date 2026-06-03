package com.sba.nutrican_be.admin.service;

import com.sba.nutrican_be.admin.dto.AdminDashboardDto;
import com.sba.nutrican_be.admin.dto.PendingKycDto;
import com.sba.nutrican_be.admin.dto.PendingPtDto;
import com.sba.nutrican_be.admin.dto.PtVerificationRequest;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.SOSTicket;
import com.sba.nutrican_be.core.entity.User;

import java.util.UUID;

public interface AdminService {

    ApiResponse<PageResponse<User>> getUsers(String role, String status, String search, int page, int size);

    ApiResponse<Void> updateUserStatus(UUID userId, String newStatus);

    ApiResponse<PageResponse<PendingPtDto>> getPendingPts(int page, int size);

    ApiResponse<Void> verifyPt(UUID userId, PtVerificationRequest request);

    ApiResponse<PageResponse<PendingKycDto>> getPendingKycs(int page, int size);

    ApiResponse<Void> approveKyc(UUID userId);

    ApiResponse<Void> rejectKyc(UUID userId, String reason);

    ApiResponse<PageResponse<SOSTicket>> getSosTickets(String status, int page, int size);

    ApiResponse<Void> assignSosTicket(UUID ticketId, UUID ptId);

    ApiResponse<AdminDashboardDto> getDashboardStats();
}
