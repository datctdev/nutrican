package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.MacroNutrients;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ForbiddenException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.MacroUtils;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
import com.sba.nutricanbe.diet.enums.PtCorrectionReason;
import com.sba.nutricanbe.diet.enums.PtReviewAction;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.diet.service.IntakeControlLoopService;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.workspace.dto.BlindEstimateRequest;
import com.sba.nutricanbe.workspace.dto.DietLogReviewResponse;
import com.sba.nutricanbe.workspace.dto.ReviewActionRequest;
import com.sba.nutricanbe.workspace.service.PtDietLogReviewService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtDietLogReviewServiceImpl implements PtDietLogReviewService {

    private static final int MAX_FOOD_DESCRIPTION_LEN = 255;
    private static final BigDecimal MAX_MACRO_VALUE = BigDecimal.valueOf(20000);

    private final PtClientMappingRepository mappingRepository;
    private final DietLogRepository dietLogRepository;
    private final UserRepository userRepository;
    private final UserQueryService userQueryService;
    private final StorageService storageService;
    private final WebSocketSessionService webSocketSessionService;
    private final IntakeControlLoopService intakeControlLoopService;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<DietLogReviewResponse>> getPendingLogs(UUID ptId, int page, int size, UUID clientId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        List<UUID> clientIds;

        if (clientId != null) {
            boolean isActiveClient = mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(
                    ptId, clientId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED));
            if (!isActiveClient) {
                throw new ForbiddenException("Bạn chỉ xem được bữa chờ duyệt của học viên đang được bạn huấn luyện");
            }
            clientIds = List.of(clientId);
        } else {
            clientIds = mappingRepository.findByPtIdWithClients(ptId).stream()
                    .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE
                            || m.getStatus() == ClientMappingStatus.END_REQUESTED)
                    .map(m -> m.getClient().getId())
                    .toList();
        }

        if (clientIds.isEmpty()) {
            return ApiResponse.success(PageResponse.from(Page.empty(pageable)));
        }

        return ApiResponse.success(pagePendingWithCalories(clientIds, page, size));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<DietLogReviewResponse>> getClientDietLogs(
            UUID ptId, UUID clientId, int page, int size, DietLogReviewStatus reviewStatus) {
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(
                ptId, clientId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))) {
            throw new ForbiddenException("Bạn chỉ xem được nhật ký của học viên đang được bạn huấn luyện");
        }

        if (reviewStatus == DietLogReviewStatus.PENDING) {
            return ApiResponse.success(pagePendingWithCalories(List.of(clientId), page, size));
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("ptReviewedAt").descending()
                .and(Sort.by("createdAt").descending()));
        Page<DietLog> rawPage = dietLogRepository
                .findByCustomerIdInAndReviewStatus(List.of(clientId), reviewStatus, pageable);

        List<DietLogReviewResponse> content = rawPage.getContent().stream()
                .map(this::toReviewResponse)
                .toList();

        PageResponse<DietLogReviewResponse> response = PageResponse.<DietLogReviewResponse>builder()
                .content(content)
                .page(rawPage.getNumber())
                .size(rawPage.getSize())
                .totalElements(rawPage.getTotalElements())
                .totalPages(rawPage.getTotalPages())
                .last(rawPage.isLast())
                .build();

        return ApiResponse.success(response);
    }

    /**
     * PENDING chỉ hiện khi có calo — paginate ở DB (jsonb), mỗi page đủ size trừ trang cuối.
     */
    private PageResponse<DietLogReviewResponse> pagePendingWithCalories(
            List<UUID> clientIds, int page, int size) {
        int safeSize = Math.max(size, 1);
        int safePage = Math.max(page, 0);
        // Native query đã ORDER BY created_at DESC — Pageable unsorted tránh double-sort lỗi.
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<DietLog> logPage = dietLogRepository.findPendingWithCaloriesByCustomerIds(
                clientIds, DietLogReviewStatus.PENDING.name(), pageable);
        List<DietLogReviewResponse> content = logPage.getContent().stream()
                .map(this::toReviewResponse)
                .toList();
        return PageResponse.<DietLogReviewResponse>builder()
                .content(content)
                .page(logPage.getNumber())
                .size(logPage.getSize())
                .totalElements(logPage.getTotalElements())
                .totalPages(logPage.getTotalPages())
                .first(logPage.isFirst())
                .last(logPage.isLast())
                .build();
    }

    @Override
    @Transactional
    public ApiResponse<DietLogReviewResponse> reviewLog(UUID logId, UUID ptId, ReviewActionRequest request) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));

        userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(
                ptId, dietLog.getCustomerId(),
                List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))) {
            throw new ForbiddenException("Bạn chỉ duyệt được bữa ăn của học viên đang được bạn huấn luyện");
        }

        if (dietLog.getReviewStatus() != DietLogReviewStatus.PENDING) {
            throw new BadRequestException("Chỉ duyệt bữa đang chờ xử lý");
        }

        String action = request.getAction() != null ? request.getAction().trim().toUpperCase() : "";
        boolean approveOnly = "APPROVE".equals(action);
        // REJECT của API cũ chỉ còn hợp lệ khi kèm dữ liệu sửa, và được xử lý như một lần chỉnh lại
        boolean adjust = "ADJUST".equals(action) || "ADJUST_MACROS".equals(action) || "REJECT".equals(action);
        if (!approveOnly && !adjust) {
            throw new BadRequestException("Invalid action: " + request.getAction());
        }
        if ("REJECT".equals(action) && request.getAdjustedCalories() == null) {
            throw new BadRequestException(
                    "Không còn thao tác từ chối để đó. Hãy chọn \"Chỉnh lại kết quả\" và nhập calo/macro đúng cho bữa ăn.");
        }

        MacroNutrients before = dietLog.getMacrosJson();
        MacroNutrients adjusted = null;
        String newName = null;
        boolean nameChanged = false;
        // Validate trước khi ghi để log giữ nguyên PENDING nếu dữ liệu sửa không dùng được
        if (!approveOnly) {
            adjusted = validateAdjustedMacros(request);
            newName = normalizeFoodDescription(request.getAdjustedFoodDescription());
            if (newName == null) {
                throw new BadRequestException(
                        "Tên món không được để trống khi chỉnh lại kết quả");
            }
            String beforeName = normalizeFoodDescription(dietLog.getFoodDescription());
            nameChanged = beforeName == null || !newName.equals(beforeName);
            boolean macrosChanged = before == null || !MacroUtils.fieldsChanged(before, adjusted).isEmpty();
            if (!nameChanged && !macrosChanged) {
                throw new BadRequestException(
                        "Chưa có thay đổi nào. Nếu bữa ăn đã đúng, hãy chọn \"Duyệt đúng\".");
            }
        }

        dietLog.setPtReviewerId(ptId);
        dietLog.setMacrosAtReview(MacroUtils.copyMacroMap(before));
        dietLog.setPtReviewedAt(LocalDateTime.now());
        dietLog.setStatus(DietLogStatus.LOGGED);
        dietLog.setReviewStatus(DietLogReviewStatus.APPROVED);

        if (approveOnly) {
            dietLog.setPtAction(PtReviewAction.APPROVE);
            dietLog.setPtAdjustedMacros(MacroUtils.copyMacroMap(before));
            if (request.getNote() != null) dietLog.setPtNote(request.getNote());
        } else {
            dietLog.setPtAction(PtReviewAction.ADJUST);
            dietLog.setPtCorrectionReason(request.getCorrectionReason() != null
                    ? request.getCorrectionReason() : PtCorrectionReason.OTHER);
            dietLog.setMacrosJson(adjusted);
            dietLog.setPtAdjustedMacros(adjusted);
            if (nameChanged) {
                dietLog.setFoodDescription(newName);
                dietLog.setMatchedFoodName(newName);
            }
            dietLog.setPtNote(request.getNote());
        }

        dietLog = dietLogRepository.save(dietLog);
        log.info("Diet log {} reviewed by PT {}: action={} -> {}", logId, ptId, action, dietLog.getPtAction());

        notifyClientOfReview(dietLog.getCustomerId(), logId,
                dietLog.getReviewStatus().name(), dietLog.getPtAction().name());
        // Macro vừa đổi: đánh giá lại OVER/UNDER/AT_RISK cho ngày đó
        intakeControlLoopService.evaluateAfterLog(dietLog.getCustomerId(), dietLog.getLogDate(), true);

        return ApiResponse.success(toReviewResponse(dietLog), "Log reviewed successfully");
    }

    /**
     * PT không được "từ chối rồi bỏ đó": mọi lần chỉnh phải để lại calo/macro dùng được cho tổng ngày.
     */
    private MacroNutrients validateAdjustedMacros(ReviewActionRequest request) {
        BigDecimal calories = requireMacro(request.getAdjustedCalories(), "Calo");
        if (calories.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Calo sau khi chỉnh phải lớn hơn 0");
        }
        return MacroNutrients.of(
                calories,
                requireMacro(request.getAdjustedProtein(), "Protein"),
                requireMacro(request.getAdjustedCarb(), "Carb"),
                requireMacro(request.getAdjustedFat(), "Fat"));
    }

    private BigDecimal requireMacro(BigDecimal value, String label) {
        if (value == null) {
            throw new BadRequestException(label + " là bắt buộc khi chỉnh lại kết quả");
        }
        if (value.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException(label + " không được âm");
        }
        if (value.compareTo(MAX_MACRO_VALUE) > 0) {
            throw new BadRequestException(label + " vượt quá giới hạn cho phép");
        }
        return value;
    }

    private String normalizeFoodDescription(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim().replaceAll("\\s+", " ");
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > MAX_FOOD_DESCRIPTION_LEN) {
            trimmed = trimmed.substring(0, MAX_FOOD_DESCRIPTION_LEN);
        }
        return trimmed;
    }

    @Override
    @Transactional
    public ApiResponse<DietLogReviewResponse> submitBlindEstimate(UUID logId, UUID ptId, BlindEstimateRequest request) {
        DietLog dietLog = dietLogRepository.findByIdWithCustomer(logId)
                .orElseThrow(() -> new ResourceNotFoundException("DietLog", logId));
        if (!mappingRepository.existsByPt_IdAndClient_IdAndStatusIn(
                ptId, dietLog.getCustomerId(),
                List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))) {
            throw new ForbiddenException("Bạn chỉ ước lượng macro cho học viên đang được bạn huấn luyện");
        }
        MacroNutrients blind = MacroUtils.buildAdjustedMacroMap(
                request.getCalories(), request.getProtein(), request.getCarb(), request.getFat());
        dietLog.setPtBlindMacros(blind);
        dietLog = dietLogRepository.save(dietLog);
        return ApiResponse.success(toReviewResponse(dietLog), "Blind estimate saved");
    }

    private DietLogReviewResponse toReviewResponse(DietLog log) {
        User customer = userQueryService.findUserById(log.getCustomerId()).orElse(null);
        String customerName = customer != null ? customer.getFullName() : null;
        String customerAvatar = customer != null ? customer.getAvatarUrl() : null;

        List<DietLogReviewResponse.AdditionalImageInfo> additionalImages = log.getAdditionalImages() == null
                ? null
                : log.getAdditionalImages().stream()
                        .map(img -> DietLogReviewResponse.AdditionalImageInfo.builder()
                                .id(img.getId())
                                .imageUrl(resolveImageUrl(img.getImageObjectName(), img.getImageUrl()))
                                .isPrimary(img.getIsPrimary())
                                .sortOrder(img.getSortOrder())
                                .build())
                        .toList();
        return DietLogReviewResponse.builder()
                .id(log.getId())
                .customerId(log.getCustomerId())
                .customerName(customerName)
                .customerAvatar(customerAvatar)
                .imageUrl(resolveImageUrl(log.getImageObjectName(), log.getImageUrl()))
                .mealType(log.getMealType())
                .foodDescription(log.getFoodDescription())
                .aiConfidenceScore(log.getAiConfidenceScore())
                .macrosJson(log.getMacrosJson())
                .status(log.getStatus())
                .reviewStatus(log.getReviewStatus())
                .logDate(log.getLogDate())
                .createdAt(log.getCreatedAt())
                .ptReviewedAt(log.getPtReviewedAt())
                .ptNote(log.getPtNote())
                .additionalImages(additionalImages)
                .mealSource(log.getMealSource())
                .mealComplexity(log.getMealComplexity())
                .restaurantName(log.getRestaurantName())
                .recognitionSource(log.getRecognitionSource())
                .aiRawJson(log.getAiRawJson())
                .aiPredictedMacros(log.getAiPredictedMacros())
                .dbMatchedMacros(log.getDbMatchedMacros())
                .macrosAtReview(log.getMacrosAtReview())
                .ptAdjustedMacros(log.getPtAdjustedMacros())
                .ptBlindMacros(log.getPtBlindMacros())
                .dbMatchScore(log.getDbMatchScore())
                .modelVersion(log.getModelVersion())
                .matchedFoodName(log.getMatchedFoodName())
                .experimentCohort(log.getExperimentCohort())
                .ptAction(log.getPtAction())
                .ptCorrectionReason(log.getPtCorrectionReason())
                .blindSubmitted(log.getPtBlindMacros() != null)
                .lateTickReason(log.getLateTickReason())
                .mealPeriod(log.getMealPeriod() != null ? log.getMealPeriod().name() : null)
                .build();
    }

    private String resolveImageUrl(String objectName, String storedUrl) {
        if (objectName != null && !objectName.isBlank()) {
            String refreshedUrl = storageService.getPresignedUrl(objectName);
            return refreshedUrl != null ? refreshedUrl : storedUrl;
        }
        return storedUrl;
    }

    private void notifyClientOfReview(UUID clientId, UUID logId, String status, String action) {
        log.info("Notifying client {} about review of log {}: status={} action={}", clientId, logId, status, action);
        Map<String, Object> payload = new HashMap<>();
        payload.put("logId", logId);
        payload.put("status", status);
        payload.put("action", action);
        webSocketSessionService.sendToUser(clientId, "DIET_LOG_REVIEWED", payload);
    }
}
