package com.sba.nutricanbe.diet.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.SosTicketResponse;
import com.sba.nutricanbe.diet.dto.CreateSosRequest;

import java.util.List;
import java.util.UUID;

public interface SosService {
    ApiResponse<Void> createSosTicket(UUID customerId, CreateSosRequest request);
    ApiResponse<List<SosTicketResponse>> getSosTickets(UUID customerId);
}
