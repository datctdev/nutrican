package com.sba.nutrican_be.admin.service;

import com.sba.nutrican_be.admin.dto.SosTicketAdminResponse;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;

import java.util.UUID;

public interface SosAdminService {

    ApiResponse<PageResponse<SosTicketAdminResponse>> getSosTickets(String status, int page, int size);

    ApiResponse<Void> assignSosTicket(UUID ticketId, UUID ptId, UUID adminId);

    ApiResponse<Void> closeSosTicket(UUID ticketId);
}
