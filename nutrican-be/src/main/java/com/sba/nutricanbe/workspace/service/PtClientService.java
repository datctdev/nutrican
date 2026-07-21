package com.sba.nutricanbe.workspace.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.workspace.dto.ClientStatusDto;
import com.sba.nutricanbe.workspace.dto.CreateClientRequest;
import com.sba.nutricanbe.workspace.dto.PtClientProfileDto;

import java.util.UUID;

public interface PtClientService {

    ApiResponse<PageResponse<ClientStatusDto>> getClients(UUID ptId, int page, int size, String statusFilter);

    ApiResponse<Void> assignClient(UUID ptId, UUID clientId);

    ApiResponse<PtClientProfileDto> getClientProfile(UUID ptId, UUID clientId);

    ApiResponse<PtClientProfileDto> updateClientProfile(UUID ptId, UUID clientId, PtClientProfileDto request);

    ApiResponse<PtClientProfileDto> createClient(UUID ptId, CreateClientRequest request);

    ApiResponse<MacroTargetResponse> setClientMacroTarget(UUID ptId, UUID clientId, MacroTargetRequest request);
}
