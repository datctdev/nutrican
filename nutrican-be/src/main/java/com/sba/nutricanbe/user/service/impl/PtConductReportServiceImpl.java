package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.dto.NotificationPayload;
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
import com.sba.nutricanbe.user.service.PtSuspendSettlementService;
import com.sba.nutricanbe.user.service.UserAccountStatusHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PtConductReportServiceImpl implements PtConductReportService {

    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;
    private static final int MAX_IMAGES = 3;
    private static final int FALSE_REPORT_COOLDOWN_DAYS = 7;
    private static final Set<Integer> ALLOWED_SUSPEND_DAYS = Set.of(7, 14, 30);
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp");

    private final PtConductReportRepository reportRepository;
    private final PtClientMappingRepository mappingRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final StorageService storageService;
    private final UserAccountStatusHelper userAccountStatusHelper;
    private final PtSuspendSettlementService suspendSettlementService;

    @Override
    @Transactional
    public PtConductReportResponse reportByCustomer(
            UUID customerId, UUID mappingId, String reasonRaw, List<MultipartFile> files) {
        if (reasonRaw == null || reasonRaw.isBlank()) {
            throw new BadRequestException("Vui lòng nêu lý do báo cáo PT");
        }
        String reason = reasonRaw.trim();
        if (reason.length() < 10) {
            throw new BadRequestException("Lý do báo cáo cần ít nhất 10 ký tự");
        }
        if (reason.length() > 1000) {
            throw new BadRequestException("Lý do báo cáo tối đa 1000 ký tự");
        }

        List<MultipartFile> evidenceFiles = normalizeFiles(files);
        if (evidenceFiles.isEmpty()) {
            throw new BadRequestException("Vui lòng đính kèm ít nhất 1 ảnh bằng chứng");
        }
        if (evidenceFiles.size() > MAX_IMAGES) {
            throw new BadRequestException("Tối đa " + MAX_IMAGES + " ảnh bằng chứng");
        }
        for (MultipartFile file : evidenceFiles) {
            validateEvidenceImage(file);
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

        assertNotInFalseReportCooldown(mappingId, customerId);

        if (reportRepository.existsByMappingIdAndCustomerIdAndStatus(
                mappingId, customerId, PtConductReportStatus.PENDING)) {
            throw new BadRequestException("Bạn đã có báo cáo đang chờ admin xử lý cho PT này");
        }

        List<String> objectNames = new ArrayList<>();
        for (MultipartFile file : evidenceFiles) {
            objectNames.add(storageService.uploadFile(file, "pt-conduct-reports/" + mappingId));
        }

        try {
            PtConductReport report = reportRepository.save(PtConductReport.builder()
                    .mappingId(mappingId)
                    .customerId(customerId)
                    .ptId(mapping.getPt().getId())
                    .reason(reason)
                    .status(PtConductReportStatus.PENDING)
                    .evidenceObjectNames(objectNames)
                    .ptSuspended(false)
                    .falseReport(false)
                    .build());

            notifyAdmins(report, mapping);

            return toResponse(report);
        } catch (DataIntegrityViolationException ex) {
            objectNames.forEach(name -> {
                try {
                    storageService.deleteFile(name);
                } catch (Exception ignored) {
                    // best-effort cleanup
                }
            });
            throw new BadRequestException("Bạn đã có báo cáo đang chờ admin xử lý cho PT này");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtConductReportResponse> listForCustomer(UUID customerId) {
        return reportRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(this::toResponse)
                .toList();
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
        if (request.getStatus() == PtConductReportStatus.DISMISSED && request.isSuspendPt()) {
            throw new BadRequestException("Không thể khóa PT khi đóng báo cáo (không vi phạm)");
        }
        if (request.getStatus() == PtConductReportStatus.REVIEWED && request.isFalseReport()) {
            throw new BadRequestException("False report chỉ áp dụng khi đóng báo cáo (DISMISSED)");
        }
        if (request.isSuspendReporter() && !request.isFalseReport()) {
            throw new BadRequestException("Chỉ khóa HV khi đánh dấu báo cáo giả");
        }

        PtConductReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("PT conduct report", reportId));
        if (report.getStatus() != PtConductReportStatus.PENDING) {
            throw new BadRequestException("Báo cáo này đã được xử lý");
        }

        String adminNote = null;
        if (request.getAdminNote() != null && !request.getAdminNote().isBlank()) {
            adminNote = request.getAdminNote().trim();
            if (adminNote.length() > 1000) {
                throw new BadRequestException("Ghi chú admin tối đa 1000 ký tự");
            }
        }

        boolean suspend = request.getStatus() == PtConductReportStatus.REVIEWED && request.isSuspendPt();
        if (suspend && (adminNote == null || adminNote.length() < 10)) {
            throw new BadRequestException("Khi khóa tài khoản PT cần ghi chú ít nhất 10 ký tự");
        }
        Integer suspendDays = normalizeSuspendDays(request.getSuspendDays(), suspend);

        if (suspend) {
            User pt = userRepository.findById(report.getPtId())
                    .orElseThrow(() -> new ResourceNotFoundException("PT", report.getPtId()));
            suspendSettlementService.settleAllForSuspendedPt(pt.getId());
            userAccountStatusHelper.suspendUser(pt, suspendDays);
            report.setPtSuspended(true);
            report.setSuspendUntil(pt.getSuspendedUntil());
            notificationService.notify(report.getPtId(), NotificationPayload.builder()
                    .type("ACCOUNT_STATUS")
                    .title("Tài khoản bị khóa")
                    .body(UserAccountStatusHelper.suspendedMessage(pt)
                            + (adminNote != null ? ". " + adminNote : ""))
                    .linkType(NotificationLinkType.OTHER)
                    .linkRefId(report.getId())
                    .build());
            dismissSiblingPendingReports(report, adminId);
        }

        if (request.getStatus() == PtConductReportStatus.DISMISSED && request.isFalseReport()) {
            report.setFalseReport(true);
            notificationService.notify(report.getCustomerId(), NotificationPayload.builder()
                    .type("PT_CONDUCT_REPORT")
                    .title("Báo cáo bị đánh dấu giả")
                    .body(adminNote != null
                            ? adminNote
                            : "Admin đánh dấu báo cáo này là bằng chứng / tố cáo không trung thực. Bạn tạm không báo cáo lại PT này trong 7 ngày.")
                    .linkType(NotificationLinkType.OTHER)
                    .linkRefId(report.getId())
                    .build());
            if (request.isSuspendReporter()) {
                User reporter = userRepository.findById(report.getCustomerId())
                        .orElseThrow(() -> new ResourceNotFoundException("Customer", report.getCustomerId()));
                Integer reporterDays = normalizeReporterSuspendDays(request.getSuspendReporterDays());
                userAccountStatusHelper.suspendUser(reporter, reporterDays);
                notificationService.notify(report.getCustomerId(), NotificationPayload.builder()
                        .type("ACCOUNT_STATUS")
                        .title("Tài khoản bị khóa")
                        .body(UserAccountStatusHelper.suspendedMessage(reporter)
                                + " do báo cáo PT không trung thực.")
                        .linkType(NotificationLinkType.OTHER)
                        .linkRefId(report.getId())
                        .build());
            }
        }

        report.setStatus(request.getStatus());
        report.setAdminNote(adminNote);
        report.setResolvedAt(DietDates.nowVn());
        report.setResolvedBy(adminId);
        reportRepository.save(report);

        notifyCustomerOutcome(report, request, adminNote, suspend);

        return toResponse(report);
    }

    @Override
    @Transactional
    public PtConductReportResponse unsuspendPt(UUID adminId, UUID ptId) {
        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));
        if (pt.getRole() != UserRole.PT_CERTIFIED && pt.getRole() != UserRole.PT_FREELANCE) {
            throw new BadRequestException("User is not a PT");
        }
        if (pt.getStatus() != UserStatus.SUSPENDED
                && !UserAccountStatusHelper.isCurrentlySuspended(pt)) {
            throw new BadRequestException("PT không đang bị khóa");
        }
        userAccountStatusHelper.unsuspendUser(pt);
        notificationService.notify(ptId, NotificationPayload.builder()
                .type("ACCOUNT_STATUS")
                .title("Tài khoản đã được mở khóa")
                .body("Admin đã mở khóa tài khoản. Bạn có thể nhận học viên mới trên marketplace.")
                .linkType(NotificationLinkType.OTHER)
                .linkRefId(ptId)
                .build());

        return reportRepository.findByPtIdAndStatus(ptId, PtConductReportStatus.REVIEWED).stream()
                .filter(PtConductReport::isPtSuspended)
                .findFirst()
                .map(this::toResponse)
                .orElse(PtConductReportResponse.builder()
                        .ptId(ptId)
                        .ptCurrentlySuspended(false)
                        .ptSuspended(false)
                        .build());
    }

    private void notifyCustomerOutcome(
            PtConductReport report,
            PtConductReportReviewRequest request,
            String adminNote,
            boolean suspend) {
        // False-report path already notified with specific copy
        if (request.getStatus() == PtConductReportStatus.DISMISSED && request.isFalseReport()) {
            return;
        }
        String hvTitle;
        String hvBody;
        if (request.getStatus() == PtConductReportStatus.DISMISSED) {
            hvTitle = "Admin đã đóng báo cáo PT";
            hvBody = adminNote != null ? adminNote : "Admin đóng: không đủ căn cứ / không vi phạm.";
        } else if (suspend) {
            hvTitle = "Admin đã xử lý báo cáo — PT bị khóa";
            hvBody = (adminNote != null ? adminNote + " " : "")
                    + "Buổi chưa dạy đã hủy; phí còn lại đã hoàn về ví. Bạn có thể thuê PT khác.";
        } else {
            hvTitle = "Admin đã tiếp nhận / xử lý báo cáo PT";
            hvBody = adminNote != null ? adminNote : "Báo cáo của bạn đã được admin tiếp nhận và xử lý.";
        }
        notificationService.notify(report.getCustomerId(), NotificationPayload.builder()
                .type("PT_CONDUCT_REPORT")
                .title(hvTitle)
                .body(hvBody)
                .linkType(NotificationLinkType.OTHER)
                .linkRefId(report.getId())
                .build());
    }

    private void dismissSiblingPendingReports(PtConductReport kept, UUID adminId) {
        List<PtConductReport> siblings = reportRepository.findByPtIdAndStatus(
                kept.getPtId(), PtConductReportStatus.PENDING);
        for (PtConductReport sibling : siblings) {
            if (sibling.getId().equals(kept.getId())) continue;
            sibling.setStatus(PtConductReportStatus.DISMISSED);
            sibling.setAdminNote("Tự động đóng — PT đã bị khóa từ báo cáo khác");
            sibling.setResolvedAt(DietDates.nowVn());
            sibling.setResolvedBy(adminId);
            reportRepository.save(sibling);
            notificationService.notify(sibling.getCustomerId(), NotificationPayload.builder()
                    .type("PT_CONDUCT_REPORT")
                    .title("Báo cáo đã đóng")
                    .body("PT đã bị khóa từ báo cáo khác; báo cáo của bạn được đóng tự động.")
                    .linkType(NotificationLinkType.OTHER)
                    .linkRefId(sibling.getId())
                    .build());
        }
    }

    private void assertNotInFalseReportCooldown(UUID mappingId, UUID customerId) {
        reportRepository
                .findFirstByMappingIdAndCustomerIdAndStatusAndFalseReportTrueOrderByResolvedAtDesc(
                        mappingId, customerId, PtConductReportStatus.DISMISSED)
                .ifPresent(prev -> {
                    LocalDateTime resolved = prev.getResolvedAt();
                    if (resolved != null
                            && resolved.plusDays(FALSE_REPORT_COOLDOWN_DAYS).isAfter(DietDates.nowVn())) {
                        throw new BadRequestException(
                                "Bạn tạm không thể báo cáo lại PT này trong 7 ngày sau báo cáo bị đánh dấu giả");
                    }
                });
    }

    private static Integer normalizeSuspendDays(Integer days, boolean requiredContext) {
        if (!requiredContext) {
            return null;
        }
        if (days == null) {
            return null; // indefinite (PT suspend only)
        }
        if (!ALLOWED_SUSPEND_DAYS.contains(days)) {
            throw new BadRequestException("Số ngày khóa hợp lệ: 7, 14, 30 (hoặc bỏ trống = vô thời hạn)");
        }
        return days;
    }

    /** False-reporter HV lock: null days defaults to 7 (never indefinite via API omit). */
    private static Integer normalizeReporterSuspendDays(Integer days) {
        if (days == null) {
            return FALSE_REPORT_COOLDOWN_DAYS;
        }
        if (!ALLOWED_SUSPEND_DAYS.contains(days)) {
            throw new BadRequestException("Số ngày khóa HV hợp lệ: 7, 14, 30");
        }
        return days;
    }

    private PtConductReportResponse toResponse(PtConductReport report) {
        String customerName = userRepository.findById(report.getCustomerId()).map(User::getFullName).orElse(null);
        User pt = userRepository.findById(report.getPtId()).orElse(null);
        String ptName = pt != null ? pt.getFullName() : null;
        boolean ptCurrentlySuspended = UserAccountStatusHelper.isCurrentlySuspended(pt);
        List<String> urls = new ArrayList<>();
        if (report.getEvidenceObjectNames() != null) {
            for (String objectName : report.getEvidenceObjectNames()) {
                if (objectName == null || objectName.isBlank()) continue;
                try {
                    urls.add(storageService.getPresignedUrl(objectName));
                } catch (Exception ignored) {
                    // skip broken object
                }
            }
        }
        return PtConductReportResponse.from(report, customerName, ptName, urls, ptCurrentlySuspended);
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

    private static List<MultipartFile> normalizeFiles(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return List.of();
        return files.stream()
                .filter(f -> f != null && !f.isEmpty())
                .toList();
    }

    private static void validateEvidenceImage(MultipartFile file) {
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new BadRequestException("Mỗi ảnh bằng chứng tối đa 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new BadRequestException("Không xác định được loại file ảnh");
        }
        String normalized = contentType.toLowerCase();
        if (!ALLOWED_IMAGE_TYPES.contains(normalized)) {
            throw new BadRequestException("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP");
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
