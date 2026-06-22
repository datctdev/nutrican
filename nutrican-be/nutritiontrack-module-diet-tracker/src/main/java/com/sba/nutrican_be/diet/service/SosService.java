package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.SosTicketResponse;
import com.sba.nutrican_be.diet.dto.CreateSosRequest;

import java.util.List;
import java.util.UUID;

public interface SosService {
    ApiResponse<Void> createSosTicket(UUID customerId, CreateSosRequest request);
    ApiResponse<List<SosTicketResponse>> getSosTickets(UUID customerId);
}
