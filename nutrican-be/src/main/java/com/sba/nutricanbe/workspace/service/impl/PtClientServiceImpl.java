package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.util.DietDates;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.repository.DietLogRepository;
import com.sba.nutricanbe.payment.service.CoachingWalletService;
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.user.dto.MappingSessionResponse;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.CoachingEvaluation;
import com.sba.nutricanbe.user.enums.CoachingHealthStatus;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.enums.MappingSessionStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.ClientGoalService;
import com.sba.nutricanbe.user.service.UserProfileService;
import com.sba.nutricanbe.user.dto.ClientGoalDto;
import com.sba.nutricanbe.user.dto.ClientGoalRequest;
import com.sba.nutricanbe.workspace.dto.ClientStatusDto;
import com.sba.nutricanbe.workspace.dto.CoachingEvaluationRequest;
import com.sba.nutricanbe.workspace.dto.CreateClientRequest;
import com.sba.nutricanbe.workspace.dto.PtClientProfileDto;
import com.sba.nutricanbe.workspace.service.PtClientService;
import com.sba.nutricanbe.workspace.service.support.PtWorkspaceAccessGuard;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtClientServiceImpl implements PtClientService {

    private static final BigDecimal KCAL_PER_G_PROTEIN = new BigDecimal("4.0");
    private static final BigDecimal KCAL_PER_G_CARB = new BigDecimal("4.0");
    private static final BigDecimal KCAL_PER_G_FAT = new BigDecimal("9.0");

    private final PtClientMappingRepository mappingRepository;
    private final PtMappingSessionRepository mappingSessionRepository;
    private final DietLogRepository dietLogRepository;
    private final UserRepository userRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final UserProfileService userProfileService;
    private final ClientGoalService clientGoalService;
    private final PtWorkspaceAccessGuard accessGuard;
    private final CoachingWalletService walletService;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<ClientStatusDto>> getClients(UUID ptId, int page, int size, String statusFilter) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PtClientMapping> mappings;

        if (statusFilter != null) {
            if ("ACTIVE".equalsIgnoreCase(statusFilter)) {
                mappings = mappingRepository.findByPt_IdAndStatusIn(
                        ptId, List.of(ClientMappingStatus.ACTIVE, ClientMappingStatus.END_REQUESTED), pageable);
            } else {
                mappings = mappingRepository.findByPtIdAndStatusWithPagination(
                        ptId, ClientMappingStatus.valueOf(statusFilter), pageable);
            }
        } else {
            mappings = mappingRepository.findByPt_Id(ptId, pageable);
        }

        return ApiResponse.success(PageResponse.from(mappings.map(this::toClientStatus)));
    }

    @Override
    @Transactional
    public ApiResponse<Void> assignClient(UUID ptId, UUID clientId) {
        throw new BadRequestException(
                "Không thể gán học viên trực tiếp. Học viên chỉ vào qua luồng thuê PT / marketplace.");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PtClientProfileDto> getClientProfile(UUID ptId, UUID clientId) {
        accessGuard.assertActiveMapping(ptId, clientId);
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", clientId));

        Optional<BodyMetric> metricOpt = bodyMetricRepository.findTopByUserIdOrderByRecordDateDesc(clientId);
        BigDecimal weight = metricOpt.map(BodyMetric::getWeight).orElse(null);
        BigDecimal bodyFat = metricOpt.map(BodyMetric::getBodyFatPercent).orElse(null);

        BigDecimal tdee = client.getMacroTarget() != null ? client.getMacroTarget().getDailyCalories() : null;
        BigDecimal protein = client.getMacroTarget() != null ? client.getMacroTarget().getProtein() : null;
        BigDecimal carb = client.getMacroTarget() != null ? client.getMacroTarget().getCarb() : null;
        BigDecimal fat = client.getMacroTarget() != null ? client.getMacroTarget().getFat() : null;

        return ApiResponse.success(PtClientProfileDto.builder()
                .clientId(client.getId())
                .fullName(client.getFullName())
                .email(client.getEmail())
                .phoneNumber(client.getPhoneNumber())
                .heightCm(client.getHeightCm())
                .gender(normalizeGenderForRead(client.getGender()))
                .dateOfBirth(client.getDateOfBirth())
                .weight(weight)
                .bodyFatPercent(bodyFat)
                .tdee(tdee)
                .allergyNotes(client.getAllergyNotes())
                .allergicFoodCodes(client.getAllergicFoodCodes())
                .dietPreference(client.getDietPreference())
                .specialNotes(client.getAddress())
                .activityLevel(client.getActivityLevel())
                .nutritionGoal(client.getNutritionGoal())
                .protein(protein)
                .carb(carb)
                .fat(fat)
                .build());
    }

    @Override
    @Transactional
    public ApiResponse<PtClientProfileDto> updateClientProfile(UUID ptId, UUID clientId, PtClientProfileDto request) {
        accessGuard.assertActiveMapping(ptId, clientId);
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", clientId));

        validateProfileUpdate(request);

        if (request.getFullName() != null) client.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) client.setPhoneNumber(request.getPhoneNumber());
        if (request.getHeightCm() != null) client.setHeightCm(request.getHeightCm());
        if (request.getGender() != null) client.setGender(normalizeGenderForWrite(request.getGender()));
        if (request.getDateOfBirth() != null) client.setDateOfBirth(request.getDateOfBirth());
        if (request.getAllergyNotes() != null) client.setAllergyNotes(request.getAllergyNotes());
        if (request.getAllergicFoodCodes() != null) client.setAllergicFoodCodes(request.getAllergicFoodCodes());
        if (request.getDietPreference() != null) client.setDietPreference(request.getDietPreference());
        if (request.getSpecialNotes() != null) client.setAddress(request.getSpecialNotes());
        if (request.getActivityLevel() != null) client.setActivityLevel(request.getActivityLevel());
        if (request.getNutritionGoal() != null) client.setNutritionGoal(request.getNutritionGoal());

        userRepository.save(client);

        if (request.getWeight() != null || request.getBodyFatPercent() != null) {
            BodyMetric metric = bodyMetricRepository
                    .findByUser_IdAndRecordDate(client.getId(), DietDates.todayVn())
                    .orElseGet(() -> BodyMetric.builder()
                            .user(client)
                            .recordDate(DietDates.todayVn())
                            .build());
            if (request.getWeight() != null) {
                metric.setWeight(request.getWeight());
            }
            if (request.getBodyFatPercent() != null) {
                metric.setBodyFatPercent(request.getBodyFatPercent());
            }
            bodyMetricRepository.save(metric);
        }

        // tdee on PUT is ignored — use PUT .../macro-target so profile save does not overwrite macros.

        return getClientProfile(ptId, clientId);
    }

    @Override
    @Transactional
    public ApiResponse<ClientGoalDto> setClientGoals(UUID ptId, UUID clientId, ClientGoalRequest request) {
        accessGuard.assertActiveMapping(ptId, clientId);
        validateClientGoals(request);
        ClientGoalDto saved = clientGoalService.saveGoals(clientId, request);
        if (request.getNutritionGoal() != null) {
            User client = userRepository.findById(clientId)
                    .orElseThrow(() -> new ResourceNotFoundException("Client", clientId));
            client.setNutritionGoal(request.getNutritionGoal());
            userRepository.save(client);
        }
        return ApiResponse.success(saved, "Đã lưu mục tiêu cân nặng");
    }

    @Override
    @Transactional
    @Deprecated
    public ApiResponse<PtClientProfileDto> createClient(UUID ptId, CreateClientRequest request) {
        throw new BadRequestException(
                "Không thể thêm học viên trực tiếp. Học viên chỉ vào qua luồng thuê PT / marketplace.");
    }

    @Override
    @Transactional
    public ApiResponse<MacroTargetResponse> setClientMacroTarget(UUID ptId, UUID clientId, MacroTargetRequest request) {
        accessGuard.assertActiveMapping(ptId, clientId);
        validateMacroTarget(request);
        return userProfileService.setMacroTarget(clientId, request);
    }

    @Override
    @Transactional
    public ApiResponse<ClientStatusDto> setCoachingEvaluation(
            UUID ptId, UUID clientId, CoachingEvaluationRequest request) {
        PtClientMapping mapping = accessGuard.requireActiveMapping(ptId, clientId);

        CoachingHealthStatus status = parseHealthStatus(request.getStatus());
        CoachingEvaluation evaluation = parseEvaluation(request.getEvaluation());
        String note = request.getNote() != null ? request.getNote().trim() : null;
        if (note != null && note.length() > 500) {
            throw new BadRequestException("Ghi chú tối đa 500 ký tự");
        }
        if ((status == CoachingHealthStatus.RED || evaluation == CoachingEvaluation.POOR)
                && (note == null || note.isBlank())) {
            throw new BadRequestException("Khi trạng thái Đỏ hoặc đánh giá Kém, bạn cần nhập ghi chú giải thích");
        }

        mapping.setCoachingStatus(status);
        mapping.setCoachingEvaluation(evaluation);
        mapping.setCoachingEvalNote(note);
        mapping.setCoachingEvalUpdatedAt(DietDates.nowVn());
        mappingRepository.save(mapping);

        return ApiResponse.success(toClientStatus(mapping), "Đã lưu trạng thái và đánh giá học viên");
    }

    private ClientStatusDto toClientStatus(PtClientMapping mapping) {
        User client = mapping.getClient();
        List<DietLog> recentLogs = dietLogRepository.findByCustomerIdAndLogDate(
                client.getId(), DietDates.todayVn());

        String suggestedStatus;
        String suggestedLabel;
        String suggestedEvaluation;
        if (recentLogs.isEmpty()) {
            suggestedStatus = CoachingHealthStatus.YELLOW.name();
            suggestedLabel = "Chưa có nhật ký hôm nay";
            suggestedEvaluation = CoachingEvaluation.AVERAGE.name();
        } else {
            suggestedStatus = CoachingHealthStatus.GREEN.name();
            suggestedLabel = "Tốt / Ổn định";
            suggestedEvaluation = CoachingEvaluation.EXCELLENT.name();
        }

        boolean statusConfirmed = mapping.getCoachingStatus() != null;
        String statusColor;
        String statusLabel;
        String evaluation;
        if (statusConfirmed) {
            statusColor = mapping.getCoachingStatus().name();
            statusLabel = labelForConfirmed(mapping.getCoachingStatus());
            evaluation = mapping.getCoachingEvaluation() != null
                    ? mapping.getCoachingEvaluation().name() : null;
        } else {
            statusColor = suggestedStatus;
            statusLabel = suggestedLabel;
            evaluation = null;
        }

        BigDecimal remainingEscrow = null;
        Integer escrowFreeSessions = null;
        if (mapping.getSelectedTrainingMode() == TrainingMode.OFFLINE
                && mapping.getPerSessionAmount() != null
                && mapping.getPerSessionAmount().signum() > 0) {
            BigDecimal remaining = walletService.getRemainingEscrow(mapping.getId());
            remainingEscrow = remaining;
            long committed = mappingSessionRepository.findByMappingIdOrderBySequenceAsc(mapping.getId()).stream()
                    .filter(s -> s.getStatus() == MappingSessionStatus.SCHEDULED
                            || s.getStatus() == MappingSessionStatus.AWAITING_CONFIRM
                            || s.getStatus() == MappingSessionStatus.DISPUTED)
                    .count();
            BigDecimal free = remaining.subtract(
                    mapping.getPerSessionAmount().multiply(BigDecimal.valueOf(committed)));
            if (free.signum() < 0) {
                free = BigDecimal.ZERO;
            }
            escrowFreeSessions = free.divide(mapping.getPerSessionAmount(), 0, RoundingMode.DOWN).intValue();
        }

        return ClientStatusDto.builder()
                .clientId(client.getId())
                .clientName(client.getFullName())
                .avatarUrl(client.getAvatarUrl())
                .status(statusColor)
                .statusLabel(statusLabel)
                .statusColor(statusColor)
                .statusConfirmed(statusConfirmed)
                .suggestedStatus(suggestedStatus)
                .suggestedEvaluation(suggestedEvaluation)
                .evaluation(evaluation)
                .coachingEvalNote(mapping.getCoachingEvalNote())
                .mappingStatus(mapping.getStatus() != null ? mapping.getStatus().name() : null)
                .endRequestedBy(mapping.getEndRequestedBy() != null ? mapping.getEndRequestedBy().name() : null)
                .selectedTrainingMode(mapping.getSelectedTrainingMode() != null
                        ? mapping.getSelectedTrainingMode().name() : null)
                .agreedAmount(mapping.getAgreedAmount())
                .agreedRateUnit(mapping.getAgreedRateUnit())
                .paymentDueAt(mapping.getPaymentDueAt())
                .venueId(mapping.getVenueId())
                .venueName(mapping.getVenueName())
                .venueAddress(mapping.getVenueAddress())
                .venueMapsUrl(mapping.getVenueMapsUrl())
                .firstSessionStart(mapping.getFirstSessionStart())
                .firstSessionEnd(mapping.getFirstSessionEnd())
                .sessionCount(mapping.getSessionCount())
                .perSessionAmount(mapping.getPerSessionAmount())
                .sessions(loadMappingSessions(mapping.getId()))
                .coachingStartedAt(mapping.getCoachingStartedAt())
                .mappingId(mapping.getId())
                .remainingEscrow(remainingEscrow)
                .escrowFreeSessions(escrowFreeSessions)
                .lastLogTime("N/A")
                .avgCalories(BigDecimal.valueOf(1800.0))
                .build();
    }

    private void validateProfileUpdate(PtClientProfileDto request) {
        if (request.getHeightCm() != null && (request.getHeightCm() < 100 || request.getHeightCm() > 250)) {
            throw new BadRequestException("Chiều cao phải từ 100–250 cm");
        }
        if (request.getWeight() != null
                && (request.getWeight().compareTo(BigDecimal.valueOf(20)) < 0
                || request.getWeight().compareTo(BigDecimal.valueOf(300)) > 0)) {
            throw new BadRequestException("Cân nặng phải từ 20–300 kg");
        }
        if (request.getBodyFatPercent() != null
                && (request.getBodyFatPercent().compareTo(BigDecimal.valueOf(3)) < 0
                || request.getBodyFatPercent().compareTo(BigDecimal.valueOf(60)) > 0)) {
            throw new BadRequestException("Tỷ lệ mỡ phải từ 3–60%");
        }
        if (request.getDateOfBirth() != null) {
            if (request.getDateOfBirth().isAfter(DietDates.todayVn())) {
                throw new BadRequestException("Ngày sinh không được ở tương lai");
            }
            if (request.getDateOfBirth().isAfter(DietDates.todayVn().minusYears(10))) {
                throw new BadRequestException("Học viên phải từ 10 tuổi trở lên");
            }
        }
        if (request.getPhoneNumber() != null && request.getPhoneNumber().length() > 20) {
            throw new BadRequestException("Số điện thoại tối đa 20 ký tự");
        }
        if (request.getSpecialNotes() != null && request.getSpecialNotes().length() > 1000) {
            throw new BadRequestException("Ghi chú tối đa 1000 ký tự");
        }
        if (request.getAllergyNotes() != null && request.getAllergyNotes().length() > 1000) {
            throw new BadRequestException("Ghi chú dị ứng tối đa 1000 ký tự");
        }
    }

    private void validateClientGoals(ClientGoalRequest request) {
        if (request.getTargetWeight() != null
                && (request.getTargetWeight().compareTo(BigDecimal.valueOf(20)) < 0
                || request.getTargetWeight().compareTo(BigDecimal.valueOf(300)) > 0)) {
            throw new BadRequestException("Cân mục tiêu phải từ 20–300 kg");
        }
        if (request.getBaselineWeight() != null
                && (request.getBaselineWeight().compareTo(BigDecimal.valueOf(20)) < 0
                || request.getBaselineWeight().compareTo(BigDecimal.valueOf(300)) > 0)) {
            throw new BadRequestException("Cân bắt đầu phải từ 20–300 kg");
        }
        if (request.getTargetDate() != null && request.getTargetDate().isBefore(DietDates.todayVn())) {
            throw new BadRequestException("Ngày dự kiến đạt không được trước hôm nay");
        }
        if (request.getTrimester() != null
                && (request.getTrimester() < 1 || request.getTrimester() > 3)) {
            throw new BadRequestException("Tam cá nguyệt phải từ 1–3");
        }
    }

    private void validateMacroTarget(MacroTargetRequest request) {
        if (request.getDailyCalories() != null
                && (request.getDailyCalories().compareTo(BigDecimal.valueOf(800)) < 0
                || request.getDailyCalories().compareTo(BigDecimal.valueOf(6000)) > 0)) {
            throw new BadRequestException("Calo mục tiêu phải từ 800–6000 kcal");
        }
        validateMacroGrams("Protein", request.getProtein());
        validateMacroGrams("Carb", request.getCarb());
        validateMacroGrams("Fat", request.getFat());
        if (request.getDailyCalories() != null
                && request.getProtein() != null
                && request.getCarb() != null
                && request.getFat() != null) {
            BigDecimal fromMacros = request.getProtein().multiply(KCAL_PER_G_PROTEIN)
                    .add(request.getCarb().multiply(KCAL_PER_G_CARB))
                    .add(request.getFat().multiply(KCAL_PER_G_FAT));
            BigDecimal diff = fromMacros.subtract(request.getDailyCalories()).abs();
            if (diff.compareTo(BigDecimal.valueOf(50)) > 0) {
                throw new BadRequestException(
                        "Tổng calo từ macro (P×4 + C×4 + F×9) lệch quá 50 kcal so với mục tiêu calo");
            }
        }
    }

    private static void validateMacroGrams(String label, BigDecimal grams) {
        if (grams == null) return;
        if (grams.compareTo(BigDecimal.ZERO) < 0 || grams.compareTo(BigDecimal.valueOf(1000)) > 0) {
            throw new BadRequestException(label + " phải từ 0–1000 g");
        }
    }

    /** Accept male/MALE/female/FEMALE; return canonical uppercase or null. */
    private static String normalizeGenderForWrite(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String g = raw.trim().toUpperCase();
        if ("MALE".equals(g) || "FEMALE".equals(g)) {
            return g;
        }
        throw new BadRequestException("Giới tính chỉ nhận Nam (MALE) hoặc Nữ (FEMALE)");
    }

    private static String normalizeGenderForRead(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String g = raw.trim().toUpperCase();
        if ("MALE".equals(g) || "FEMALE".equals(g)) {
            return g;
        }
        return raw;
    }

    private static String labelForConfirmed(CoachingHealthStatus status) {
        return switch (status) {
            case GREEN -> "Tốt / Ổn định";
            case YELLOW -> "Cần chú ý";
            case RED -> "Cảnh báo";
        };
    }

    private static CoachingHealthStatus parseHealthStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Vui lòng chọn trạng thái (Tốt, Cần chú ý, hoặc Cảnh báo)");
        }
        try {
            return CoachingHealthStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Trạng thái không hợp lệ. Chọn: Tốt / Ổn định, Cần chú ý, hoặc Cảnh báo");
        }
    }

    private static CoachingEvaluation parseEvaluation(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Vui lòng chọn đánh giá chung (Tuyệt vời, Trung bình, hoặc Kém)");
        }
        try {
            return CoachingEvaluation.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Đánh giá không hợp lệ. Chọn: Tuyệt vời, Trung bình, hoặc Kém");
        }
    }

    private List<MappingSessionResponse> loadMappingSessions(UUID mappingId) {
        return mappingSessionRepository.findByMappingIdOrderBySequenceAsc(mappingId).stream()
                .map(MappingSessionResponse::from)
                .toList();
    }
}
