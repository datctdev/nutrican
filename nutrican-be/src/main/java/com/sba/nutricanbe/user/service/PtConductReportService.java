package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.PtConductReportResponse;
import com.sba.nutricanbe.user.dto.PtConductReportReviewRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface PtConductReportService {

    PtConductReportResponse reportByCustomer(
            UUID customerId, UUID mappingId, String reason, List<MultipartFile> files);

    List<PtConductReportResponse> listForCustomer(UUID customerId);

    List<PtConductReportResponse> listForAdmin(String status);

    PtConductReportResponse resolveByAdmin(UUID adminId, UUID reportId, PtConductReportReviewRequest request);

    /** Admin mở khóa PT sớm (không hoàn tác escrow / mapping cũ). */
    PtConductReportResponse unsuspendPt(UUID adminId, UUID ptId);
}
