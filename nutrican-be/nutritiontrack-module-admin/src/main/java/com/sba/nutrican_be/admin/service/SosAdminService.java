package com.sba.nutrican_be.admin.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.SOSTicket;

import java.util.UUID;

public interface SosAdminService {

    ApiResponse<PageResponse<SOSTicket>> getSosTickets(String status, int page, int size);

    ApiResponse<Void> assignSosTicket(UUID ticketId, UUID ptId);
}
