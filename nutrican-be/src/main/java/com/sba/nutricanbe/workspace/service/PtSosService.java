package com.sba.nutricanbe.workspace.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.response.SosTicketResponse;

import java.util.List;
import java.util.UUID;

public interface PtSosService {

    ApiResponse<List<SosTicketResponse>> getSosTickets(UUID ptId);

    ApiResponse<Void> resolveSosTicket(UUID ticketId, UUID ptId, String note);
}
