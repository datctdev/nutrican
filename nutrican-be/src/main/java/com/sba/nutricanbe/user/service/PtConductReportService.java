package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.PtConductReportRequest;
import com.sba.nutricanbe.user.dto.PtConductReportResponse;
import com.sba.nutricanbe.user.dto.PtConductReportReviewRequest;

import java.util.List;
import java.util.UUID;

public interface PtConductReportService {

    PtConductReportResponse reportByCustomer(UUID customerId, UUID mappingId, PtConductReportRequest request);

    List<PtConductReportResponse> listForAdmin(String status);

    PtConductReportResponse resolveByAdmin(UUID adminId, UUID reportId, PtConductReportReviewRequest request);
}
