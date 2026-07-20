package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.Review;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.ReviewRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.dto.CreateReviewRequest;
import com.sba.nutricanbe.user.dto.PtClientMappingResponse;
import com.sba.nutricanbe.user.dto.PtProfileResponse;
import com.sba.nutricanbe.user.dto.PtSearchRequest;
import com.sba.nutricanbe.user.dto.ReviewResponse;
import com.sba.nutricanbe.user.dto.HirePtRequest;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.service.MarketplaceService;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarketplaceServiceImpl implements MarketplaceService {

    private final PtProfileRepository ptProfileRepository;
    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final PtClientMappingRepository mappingRepository;
    private final WebSocketSessionService webSocketSessionService;
    private final StorageService storageService;

    @Value("${app.payment.accepted-request-hours:24}")
    private long acceptedRequestHours;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<PtProfileResponse>> searchPts(PtSearchRequest request, User customer) {
        if (customer != null && customer.hasCustomerPrivileges()) {
            request.setCustomerId(customer.getId());
            if (customer.getNutritionGoal() != null) {
                request.setCustomerNutritionGoal(customer.getNutritionGoal().name());
            }
            if (customer.getDietPreference() != null) {
                request.setCustomerDietPreference(customer.getDietPreference().name());
            }
        }
        return searchPtsInternal(request);
    }

    private ApiResponse<PageResponse<PtProfileResponse>> searchPtsInternal(PtSearchRequest request) {
        Sort sort = buildSort(request);
        Pageable pageable = PageRequest.of(request.getPage(), request.getSize(), sort);

        Page<PtProfile> page;
        if (Boolean.TRUE.equals(request.getVerifiedOnly())) {
            page = request.getTier() != null
                    ? ptProfileRepository.findByIsVerifiedTrueAndTier(Tier.valueOf(request.getTier()), pageable)
                    : ptProfileRepository.findByIsVerifiedTrue(pageable);
        } else {
            page = ptProfileRepository.findAll(pageable);
        }

        java.util.List<PtProfileResponse> mapped = page.getContent().stream()
                .map(profile -> enrichSearchResult(profile, request))
                .filter(r -> matchesFilters(r, request))
                .toList();

        if ("compatibility".equalsIgnoreCase(request.getSort())) {
            mapped = mapped.stream()
                    .sorted(Comparator.comparing(this::compatibilityScore).reversed())
                    .toList();
        }

        PageResponse<PtProfileResponse> response = PageResponse.<PtProfileResponse>builder()
                .content(mapped)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
        return ApiResponse.success(response);
    }

    private Sort buildSort(PtSearchRequest request) {
        if ("compatibility".equalsIgnoreCase(request.getSort())) {
            return Sort.unsorted();
        }
        String sortBy = request.getSortBy() != null ? request.getSortBy() : "tier";
        return request.getSortDir().equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
    }

    private PtProfileResponse enrichSearchResult(PtProfile profile, PtSearchRequest request) {
        PtProfileResponse response = PtProfileResponse.toPtProfileResponse(profile);
        UUID ptUserId = profile.getUser().getId();
        long active = mappingRepository.countByPt_IdAndStatusIn(
                ptUserId,
                List.of(
                        ClientMappingStatus.AWAITING_PAYMENT,
                        ClientMappingStatus.ACTIVE,
                        ClientMappingStatus.END_REQUESTED));
        int max = profile.getMaxClients() != null ? profile.getMaxClients() : 10;
        response.setActiveClientCount(active);
        response.setSlotsAvailable(active < max);
        if (request.getCustomerId() != null) {
            mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(
                            ptUserId, request.getCustomerId())
                    .ifPresent(mapping -> {
                        response.setMappingId(mapping.getId());
                        response.setMappingStatus(mapping.getStatus().name());
                        response.setSelectedTrainingMode(mapping.getSelectedTrainingMode() != null
                                ? mapping.getSelectedTrainingMode().name() : null);
                        response.setAgreedAmount(mapping.getAgreedAmount());
                        response.setAgreedRateUnit(mapping.getAgreedRateUnit());
                        response.setPaymentDueAt(mapping.getPaymentDueAt());
                    });
        }
        String goalForMatch = request.getGoalFilter() != null
                ? request.getGoalFilter() : request.getCustomerNutritionGoal();
        String dietForMatch = request.getDietFilter() != null
                ? request.getDietFilter() : request.getCustomerDietPreference();
        if (goalForMatch != null && profile.getPreferredGoals() != null) {
            response.setGoalMatch(profile.getPreferredGoals().contains(goalForMatch));
        }
        if (dietForMatch != null && profile.getPreferredDietTypes() != null) {
            response.setDietMatch(profile.getPreferredDietTypes().contains(dietForMatch));
        }
        return response;
    }

    private boolean matchesFilters(PtProfileResponse r, PtSearchRequest request) {
        if (request.getGoalFilter() != null && !Boolean.TRUE.equals(r.getGoalMatch())) {
            return false;
        }
        if (request.getDietFilter() != null && !Boolean.TRUE.equals(r.getDietMatch())) {
            return false;
        }
        String term = request.getSearch();
        if (term == null || term.isBlank()) {
            term = request.getSpecialization();
        }
        if (term != null && !term.isBlank()) {
            String q = term.toLowerCase(Locale.ROOT);
            boolean nameMatch = r.getFullName() != null && r.getFullName().toLowerCase(Locale.ROOT).contains(q);
            boolean bioMatch = r.getBio() != null && r.getBio().toLowerCase(Locale.ROOT).contains(q);
            boolean specMatch = r.getSpecializations() != null && r.getSpecializations().stream()
                    .anyMatch(s -> s != null && s.toLowerCase(Locale.ROOT).contains(q));
            if (!nameMatch && !bioMatch && !specMatch) {
                return false;
            }
        }
        return true;
    }

    private int compatibilityScore(PtProfileResponse r) {
        int score = 0;
        if (Boolean.TRUE.equals(r.getGoalMatch())) score += 2;
        if (Boolean.TRUE.equals(r.getDietMatch())) score += 2;
        if (Boolean.TRUE.equals(r.getSlotsAvailable())) score += 1;
        if (r.getRating() != null) {
            score += r.getRating().intValue();
        }
        return score;
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtProfileResponse> getPtDetail(UUID ptId, User user) {
        PtProfile profile = ptProfileRepository.findByIdWithUser(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));

        PtProfileResponse response = PtProfileResponse.toPtProfileResponse(profile);

        if (user != null && user.hasCustomerPrivileges()) {
            mappingRepository.findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(
                            profile.getUser().getId(), user.getId())
                    .ifPresent(mapping -> {
                        response.setMappingId(mapping.getId());
                        response.setMappingStatus(mapping.getStatus().name());
                        response.setSelectedTrainingMode(mapping.getSelectedTrainingMode() != null
                                ? mapping.getSelectedTrainingMode().name() : null);
                        response.setAgreedAmount(mapping.getAgreedAmount());
                        response.setAgreedRateUnit(mapping.getAgreedRateUnit());
                        response.setPaymentDueAt(mapping.getPaymentDueAt());
                    });
        }

        return ApiResponse.success(response);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<ReviewResponse>> getPtReviews(UUID ptId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Review> reviewPage = reviewRepository.findByPtId(ptId, pageable);
        return ApiResponse.success(PageResponse.from(reviewPage.map(ReviewResponse::toReviewResponse)));
    }

    @Override
    @Transactional
    public ApiResponse<ReviewResponse> createReview(UUID ptId, UUID reviewerId, CreateReviewRequest request, org.springframework.web.multipart.MultipartFile image) {
        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        if (pt.getRole() != UserRole.PT_CERTIFIED && pt.getRole() != UserRole.PT_FREELANCE) {
            throw new BadRequestException("User is not a PT");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer", reviewerId));

        boolean hasCompleted = mappingRepository.existsByPt_IdAndClient_IdAndStatus(
                ptId, reviewerId, ClientMappingStatus.COMPLETED);

        if (!hasCompleted) {
            throw new BadRequestException("Bạn chỉ có thể đánh giá sau khi đã hoàn thành khóa Huấn luyện với PT này (Trạng thái Kết thúc).");
        }

        String uploadedImageUrl = null;
        if (image != null && !image.isEmpty()) {
            uploadedImageUrl = storageService.uploadFile(image, "reviews");
        }

        Review review = Review.builder()
                .pt(pt)
                .reviewer(reviewer)
                .rating(request.getRating())
                .comment(request.getComment())
                .isAnonymous(Boolean.TRUE.equals(request.getIsAnonymous()))
                .imageUrl(uploadedImageUrl)
                .build();

        review = reviewRepository.save(review);

        PtProfile profile = ptProfileRepository.findByUserId(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));

        Double avgRating = reviewRepository.findAverageRatingByPtId(ptId);
        profile.setRating(avgRating != null ? BigDecimal.valueOf(avgRating) : BigDecimal.valueOf(5.0));
        profile.setTotalReviews((int) reviewRepository.countByPtId(ptId));
        ptProfileRepository.save(profile);

        log.info("Review created for PT: {} by user: {}", ptId, reviewerId);
        return ApiResponse.success(ReviewResponse.toReviewResponse(review), "Gửi đánh giá thành công!");
    }

    @Override
    @Transactional
    public ApiResponse<PtClientMappingResponse> hirePt(
            UUID ptId, UUID customerId, HirePtRequest request) {
        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));
        if (pt.getRole() != UserRole.PT_CERTIFIED && pt.getRole() != UserRole.PT_FREELANCE) {
            throw new BadRequestException("User is not a PT");
        }

        PtProfile profile = ptProfileRepository.findByUserId(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));
        if (!Boolean.TRUE.equals(profile.getIsVerified())) {
            throw new BadRequestException("PT must be verified before accepting clients");
        }

        // Serialize hire requests per customer so double-clicks cannot create
        // two concurrent open contracts.
        User customer = userRepository.findByIdForUpdate(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", customerId));
        if (!customer.hasCustomerPrivileges()) {
            throw new BadRequestException("Only customers can hire a PT");
        }
        if (pt.getId().equals(customer.getId())) {
            throw new BadRequestException("You cannot hire yourself");
        }

        TrainingMode selectedMode = request.getTrainingMode();
        if (selectedMode == TrainingMode.BOTH) {
            throw new BadRequestException("Please select either ONLINE or OFFLINE coaching");
        }
        boolean modeAvailable = profile.getTrainingMode() == TrainingMode.BOTH
                || profile.getTrainingMode() == selectedMode;
        if (!modeAvailable) {
            throw new BadRequestException("This PT does not offer the selected coaching mode");
        }

        BigDecimal agreedAmount = selectedMode == TrainingMode.ONLINE
                ? profile.getOnlineRate() : profile.getOfflineRate();
        String agreedRateUnit = selectedMode == TrainingMode.ONLINE
                ? profile.getOnlineRateUnit() : profile.getOfflineRateUnit();
        if (agreedAmount == null || agreedAmount.signum() <= 0 || agreedRateUnit == null
                || agreedRateUnit.isBlank()) {
            throw new BadRequestException("The selected coaching package does not have a valid price");
        }

        mappingRepository.findFirstByClient_IdAndStatusIn(
                        customerId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED))
                .ifPresent(active -> {
                    if (!active.getPt().getId().equals(ptId)) {
                        throw new BadRequestException("Bạn đang có PT. Kết thúc coaching hiện tại trước.");
                    }
                });

        mappingRepository.findFirstByClient_IdAndStatusIn(
                        customerId, List.of(ClientMappingStatus.PENDING, ClientMappingStatus.AWAITING_PAYMENT))
                .ifPresent(openRequest -> {
                    if (!openRequest.getPt().getId().equals(ptId)) {
                        throw new BadRequestException(
                                "You already have another coaching request in progress");
                    }
                });

        PtClientMapping mapping = mappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, customerId)
                .map(existing -> {
                    if (existing.getStatus() == ClientMappingStatus.ACTIVE) {
                        throw new BadRequestException("Bạn đã liên kết với Huấn luyện viên này rồi.");
                    }
                    if (existing.getStatus() == ClientMappingStatus.PENDING) {
                        throw new BadRequestException("Bạn đã gửi yêu cầu trước đó, vui lòng chờ PT xác nhận.");
                    }
                    if (existing.getStatus() == ClientMappingStatus.AWAITING_PAYMENT) {
                        throw new BadRequestException("PT has accepted. Please complete payment first.");
                    }
                    if (existing.getStatus() == ClientMappingStatus.END_REQUESTED) {
                        throw new BadRequestException(
                                "Please complete the current coaching termination first");
                    }

                    // Each new hire is a separate coaching contract. Keeping the
                    // previous mapping immutable preserves its payment and escrow history.
                    return PtClientMapping.builder()
                            .pt(pt)
                            .client(customer)
                            .status(ClientMappingStatus.PENDING)
                            .selectedTrainingMode(selectedMode)
                            .agreedAmount(agreedAmount)
                            .agreedRateUnit(agreedRateUnit)
                            .build();
                })
                .orElseGet(() -> PtClientMapping.builder()
                        .pt(pt)
                        .client(customer)
                        .status(ClientMappingStatus.PENDING)
                        .selectedTrainingMode(selectedMode)
                        .agreedAmount(agreedAmount)
                        .agreedRateUnit(agreedRateUnit)
                        .build());

        mapping = mappingRepository.save(mapping);
        return ApiResponse.success(PtClientMappingResponse.toMappingResponse(mapping), "Hiring request sent");
    }

    @Override
    @Transactional
    public ApiResponse<PtClientMappingResponse> updateHireRequest(UUID clientId, UUID ptId, String action) {
        PtClientMapping mapping = mappingRepository
                .findTopByPt_IdAndClient_IdOrderByCreatedAtDesc(ptId, clientId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", clientId));

        if (mapping.getStatus() != ClientMappingStatus.PENDING) {
            throw new BadRequestException("Only pending hiring requests can be updated");
        }

        String normalized = action != null ? action.trim().toUpperCase() : "";
        switch (normalized) {
            case "ACCEPT" -> {
                // Lock the PT profile while counting/reserving slots so two
                // simultaneous accepts cannot exceed maxClients.
                PtProfile profile = ptProfileRepository.findByUserIdForUpdate(ptId)
                        .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptId));
                int max = profile.getMaxClients() != null ? profile.getMaxClients() : 10;
                long reservedSlots = mappingRepository.countByPt_IdAndStatusIn(
                        ptId,
                        List.of(
                                ClientMappingStatus.AWAITING_PAYMENT,
                                ClientMappingStatus.ACTIVE,
                                ClientMappingStatus.END_REQUESTED));
                if (reservedSlots >= max) {
                    throw new BadRequestException("PT đã đủ số client tối đa (" + max + ")");
                }
                mapping.setStatus(ClientMappingStatus.AWAITING_PAYMENT);
                mapping.setAcceptedAt(LocalDateTime.now());
                mapping.setPaymentDueAt(LocalDateTime.now()
                        .plusHours(Math.max(1, acceptedRequestHours)));
            }
            case "REJECT", "DECLINE" -> {
                mapping.setStatus(ClientMappingStatus.INACTIVE);
                mapping.setAcceptedAt(null);
                mapping.setPaymentDueAt(null);
            }
            default -> throw new BadRequestException("Invalid action: " + action);
        }

        mapping = mappingRepository.save(mapping);
        String message = mapping.getStatus() == ClientMappingStatus.AWAITING_PAYMENT
                ? "Hiring request accepted. Waiting for customer payment."
                : "Hiring request rejected";
        notifyHireResult(mapping, mapping.getStatus() == ClientMappingStatus.AWAITING_PAYMENT);
        return ApiResponse.success(PtClientMappingResponse.toMappingResponse(mapping), message);
    }

    private void notifyHireResult(PtClientMapping mapping, boolean accepted) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("mappingId", mapping.getId());
        payload.put("ptId", mapping.getPt().getId());
        payload.put("customerId", mapping.getClient().getId());
        payload.put("accepted", accepted);
        payload.put("message", accepted
                ? "PT đã chấp nhận. Vui lòng thanh toán để bắt đầu coaching."
                : "PT đã từ chối yêu cầu coaching.");
        String event = accepted ? "HIRE_ACCEPTED" : "HIRE_REJECTED";
        webSocketSessionService.sendToUser(mapping.getClient().getId(), event, payload);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtClientMappingResponse> getOpenHireRequest(UUID customerId) {
        PtClientMappingResponse response = mappingRepository.findFirstByClient_IdAndStatusIn(
                        customerId,
                        List.of(ClientMappingStatus.PENDING, ClientMappingStatus.AWAITING_PAYMENT))
                .map(PtClientMappingResponse::toMappingResponse)
                .orElse(null);
        return ApiResponse.success(response);
    }

    @Override
    @Transactional
    public ApiResponse<ReviewResponse> updateReview(UUID ptId, UUID reviewId, UUID reviewerId, CreateReviewRequest request, org.springframework.web.multipart.MultipartFile image) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", reviewId));

        if (!review.getReviewer().getId().equals(reviewerId)) {
            throw new BadRequestException("Bạn chỉ có thể chỉnh sửa đánh giá của chính mình.");
        }

        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setIsAnonymous(Boolean.TRUE.equals(request.getIsAnonymous()));

        if (image != null && !image.isEmpty()) {
            String uploadedImageUrl = storageService.uploadFile(image, "reviews");
            review.setImageUrl(uploadedImageUrl);
        }

        reviewRepository.save(review);
        updatePtRatingStats(ptId);

        return ApiResponse.success(ReviewResponse.toReviewResponse(review), "Cập nhật đánh giá thành công!");
    }

    @Override
    @Transactional
    public ApiResponse<Void> deleteReview(UUID ptId, UUID reviewId, UUID reviewerId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", reviewId));

        if (!review.getReviewer().getId().equals(reviewerId)) {
            throw new BadRequestException("Bạn chỉ có thể xóa đánh giá của chính mình.");
        }

        reviewRepository.delete(review);
        updatePtRatingStats(ptId);

        return ApiResponse.success(null, "Đã xóa đánh giá thành công!");
    }

    private void updatePtRatingStats(UUID ptId) {
        PtProfile profile = ptProfileRepository.findByUserId(ptId).orElse(null);
        if (profile != null) {
            Double avgRating = reviewRepository.findAverageRatingByPtId(ptId);
            profile.setRating(avgRating != null ? BigDecimal.valueOf(avgRating) : BigDecimal.valueOf(5.0));
            profile.setTotalReviews((int) reviewRepository.countByPtId(ptId));
            ptProfileRepository.save(profile);
        }
    }
}
