package com.sba.nutricanbe.workspace.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.workspace.dto.ApplyTemplateRequest;
import com.sba.nutricanbe.workspace.dto.CreateTemplateRequest;
import com.sba.nutricanbe.workspace.dto.TemplateResponse;

import java.util.List;
import java.util.UUID;

public interface PtTemplateService {

    ApiResponse<TemplateResponse> saveAsTemplate(UUID ptId, CreateTemplateRequest request);

    ApiResponse<List<TemplateResponse>> getTemplatesByPt(UUID ptId);

    ApiResponse<Void> applyTemplateToClient(UUID ptId, UUID templateId, UUID clientId, ApplyTemplateRequest request);
}
