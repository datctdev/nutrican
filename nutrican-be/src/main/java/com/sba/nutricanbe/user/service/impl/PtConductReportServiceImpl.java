package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.dto.NotificationPayload;
import com.sba.nutricanbe.user.dto.PtConductReportRequest;
import com.sba.nutricanbe.user.dto.PtConductReportResponse;
import com.sba.nutricanbe.user.dto.PtConductReportReviewRequest;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtConductReport;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.NotificationLinkType;
import com.sba.nutricanbe.user.enums.PtConductReportStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtConductReportRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.NotificationService;
import com.sba.nutricanbe.user.service.PtConductReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PtConductReportServiceImpl implements PtConductReportService {

    private final PtConductReportRepository reportRepository;
    private final PtClientMappingRepository mappingRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public PtConductReportResponse reportByCustomer(UUID customerId, UUID mappingId, PtConductReportRequest request) {
        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Vui lòng nêu lý do báo cáo PT");
        }
        String reason = request.getReason().trim();
        if (reason.length() < 10) {
            throw new BadRequestException("Lý do báo cáo cần ít nhất 10 ký tự");
        }
        if (reason.length() > 1000) {
            throw new BadRequestException("Lý do báo cáo tối đa 1000 ký tự");
        }

        PtClientMapping mapping = mappingRepository.findByIdWithUsers(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", mappingId));
        if (!mapping.getClient().getId().equals(customerId)) {
            throw new BadRequestException("Bạn không thuộc quan hệ coaching này");
        }
        if (mapping.getStatus() != ClientMappingStatus.ACTIVE
                && mapping.getStatus() != ClientMappingStatus.END_REQUESTED
                && mapping.getStatus() != ClientMappingStatus.COMPLETED) {
            throw new BadRequestException("Chỉ báo cáo PT khi đã từng / đang coaching");
        }

        if (reportRepository.existsByMappingIdAndCustomerIdAndStatus(
                mappingId, customerId, PtConductReportStatus.PENDING)) {
            throw new BadRequestException("Bạn đã có báo cáo đang chờ admin xử lý cho PT này");
        }

        PtConductReport report = reportRepository.save(PtConductReport.builder()
                .mappingId(mappingId)
                .customerId(customerId)
                .ptId(mapping.getPt().getId())
                .reason(reason)
                .status(PtConductReportStatus.PENDING)
                .build());

        notifyAdmins(report, mapping);

        return PtConductReportResponse.from(
                report,
                mapping.getClient().getFullName(),
                mapping.getPt().getFullName());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtConductReportResponse> listForAdmin(String status) {
        List<PtConductReport> reports;
        if (status != null && !status.isBlank()) {
            try {
                PtConductReportStatus parsed = PtConductReportStatus.valueOf(status.trim().toUpperCase());
                reports = reportRepository.findByStatusOrderByCreatedAtDesc(parsed);
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Trạng thái báo cáo không hợp lệ");
            }
        } else {
            reports = reportRepository.findAllByOrderByCreatedAtDesc();
        }
        return reports.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public PtConductReportResponse resolveByAdmin(UUID adminId, UUID reportId, PtConductReportReviewRequest request) {
        if (request == null || request.getStatus() == null) {
            throw new BadRequestException("Chọn kết quả xử lý: REVIEWED hoặc DISMISSED");
        }
        if (!EnumSet.of(PtConductReportStatus.REVIEWED, PtConductReportStatus.DISMISSED)
                .contains(request.getStatus())) {
            throw new BadRequestException("Chỉ chấp nhận REVIEWED hoặc DISMISSED");
        }

        PtConductReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("PT conduct report", reportId));
        if (report.getStatus() != PtConductReportStatus.PENDING) {
            throw new BadRequestException("Báo cáo này đã được xử lý");
        }

        report.setStatus(request.getStatus());
        report.setAdminNote(request.getAdminNote() != null ? request.getAdminNote().trim() : null);
        report.setResolvedAt(LocalDateTime.now());
        report.setResolvedBy(adminId);
        reportRepository.save(report);

        String title = request.getStatus() == PtConductReportStatus.REVIEWED
                ? "Admin đã tiếp nhận báo cáo PT"
                : "Admin đã đóng báo cáo PT";
        notificationService.notify(report.getCustomerId(), NotificationPayload.builder()
                .type("PT_CONDUCT_REPORT")
                .title(title)
                .body(request.getAdminNote() != null && !request.getAdminNote().isBlank()
                        ? request.getAdminNote()
                        : "Báo cáo của bạn đã được cập nhật.")
                .linkType(NotificationLinkType.OTHER)
                .linkRefId(report.getId())
                .build());

        return toResponse(report);
    }

    private PtConductReportResponse toResponse(PtConductReport report) {
        String customerName = userRepository.findById(report.getCustomerId()).map(User::getFullName).orElse(null);
        String ptName = userRepository.findById(report.getPtId()).map(User::getFullName).orElse(null);
        return PtConductReportResponse.from(report, customerName, ptName);
    }

    private void notifyAdmins(PtConductReport report, PtClientMapping mapping) {
        String ptName = mapping.getPt() != null ? mapping.getPt().getFullName() : "PT";
        String customerName = mapping.getClient() != null ? mapping.getClient().getFullName() : "Học viên";
        NotificationPayload payload = NotificationPayload.builder()
                .type("PT_CONDUCT_REPORT")
                .title("Báo cáo PT mới")
                .body(customerName + " báo cáo " + ptName + ": " + truncate(report.getReason(), 120))
                .linkType(NotificationLinkType.OTHER)
                .linkRefId(report.getId())
                .build();
        userRepository.findByRole(UserRole.ADMIN, Pageable.unpaged()).forEach(admin ->
                notificationService.notify(admin.getId(), payload));
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
