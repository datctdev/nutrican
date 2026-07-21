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
import com.sba.nutricanbe.user.dto.MacroTargetRequest;
import com.sba.nutricanbe.user.dto.MacroTargetResponse;
import com.sba.nutricanbe.user.dto.MappingSessionResponse;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.UserProfileService;
import com.sba.nutricanbe.workspace.dto.ClientStatusDto;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtClientServiceImpl implements PtClientService {

    private static final String DEFAULT_CLIENT_PASSWORD = "NutriCan123@";
    private static final BigDecimal PROTEIN_RATIO = new BigDecimal("0.30");
    private static final BigDecimal CARB_RATIO = new BigDecimal("0.40");
    private static final BigDecimal FAT_RATIO = new BigDecimal("0.30");
    private static final BigDecimal KCAL_PER_G_PROTEIN = new BigDecimal("4.0");
    private static final BigDecimal KCAL_PER_G_CARB = new BigDecimal("4.0");
    private static final BigDecimal KCAL_PER_G_FAT = new BigDecimal("9.0");

    private final PtClientMappingRepository mappingRepository;
    private final PtMappingSessionRepository mappingSessionRepository;
    private final DietLogRepository dietLogRepository;
    private final UserRepository userRepository;
    private final BodyMetricRepository bodyMetricRepository;
    private final UserProfileService userProfileService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final PtWorkspaceAccessGuard accessGuard;

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
        if (mappingRepository.existsByPt_IdAndClient_Id(ptId, clientId)) {
            throw new BadRequestException("Client already assigned to this PT");
        }

        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", clientId));

        PtClientMapping mapping = PtClientMapping.builder()
                .pt(pt)
                .client(client)
                .status(ClientMappingStatus.ACTIVE)
                .build();

        mappingRepository.save(mapping);
        log.info("Client {} assigned to PT {}", clientId, ptId);
        return ApiResponse.success(null, "Client assigned successfully");
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
                .gender(client.getGender())
                .dateOfBirth(client.getDateOfBirth())
                .weight(weight)
                .bodyFatPercent(bodyFat)
                .tdee(tdee)
                .allergyNotes(client.getAllergyNotes())
                .dietPreference(client.getDietPreference())
                .specialNotes(client.getAddress())
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

        if (request.getFullName() != null) client.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) client.setPhoneNumber(request.getPhoneNumber());
        if (request.getHeightCm() != null) client.setHeightCm(request.getHeightCm());
        if (request.getGender() != null) client.setGender(request.getGender());
        if (request.getDateOfBirth() != null) client.setDateOfBirth(request.getDateOfBirth());
        if (request.getAllergyNotes() != null) client.setAllergyNotes(request.getAllergyNotes());
        if (request.getDietPreference() != null) client.setDietPreference(request.getDietPreference());
        if (request.getSpecialNotes() != null) client.setAddress(request.getSpecialNotes());

        userRepository.save(client);

        LocalDate today = LocalDate.now();
        if (request.getWeight() != null) {
            BodyMetric metric = bodyMetricRepository
                    .findByUser_IdAndRecordDate(client.getId(), today)
                    .orElseGet(() -> BodyMetric.builder()
                            .user(client)
                            .recordDate(today)
                            .build());
            metric.setWeight(request.getWeight());
            if (request.getBodyFatPercent() != null) {
                metric.setBodyFatPercent(request.getBodyFatPercent());
            }
            bodyMetricRepository.save(metric);
        }

        if (request.getTdee() != null) {
            userProfileService.setMacroTarget(client.getId(), buildMacroTargetFromTdee(request.getTdee()));
        }

        return getClientProfile(ptId, clientId);
    }

    @Override
    @Transactional
    public ApiResponse<PtClientProfileDto> createClient(UUID ptId, CreateClientRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email này đã được đăng ký trong hệ thống");
        }

        User client = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(DEFAULT_CLIENT_PASSWORD))
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .heightCm(request.getHeightCm())
                .gender(request.getGender())
                .dateOfBirth(request.getDateOfBirth())
                .allergyNotes(request.getAllergyNotes())
                .dietPreference(request.getDietPreference() != null ? request.getDietPreference() : DietPreference.NORMAL)
                .address(request.getSpecialNotes())
                .role(UserRole.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .passwordSetRequired(true)
                .onboardingStep(1)
                .build();

        client = userRepository.save(client);

        User pt = userRepository.findById(ptId)
                .orElseThrow(() -> new ResourceNotFoundException("PT", ptId));

        PtClientMapping mapping = PtClientMapping.builder()
                .pt(pt)
                .client(client)
                .status(ClientMappingStatus.ACTIVE)
                .build();
        mappingRepository.save(mapping);

        if (request.getTdee() != null) {
            userProfileService.setMacroTarget(client.getId(), buildMacroTargetFromTdee(request.getTdee()));
        }

        if (request.getWeight() != null) {
            BodyMetric metric = BodyMetric.builder()
                    .user(client)
                    .recordDate(DietDates.todayVn())
                    .weight(request.getWeight())
                    .bodyFatPercent(request.getBodyFatPercent())
                    .build();
            bodyMetricRepository.save(metric);
        }

        return getClientProfile(ptId, client.getId());
    }

    @Override
    @Transactional
    public ApiResponse<MacroTargetResponse> setClientMacroTarget(UUID ptId, UUID clientId, MacroTargetRequest request) {
        accessGuard.assertActiveMapping(ptId, clientId);
        return userProfileService.setMacroTarget(clientId, request);
    }

    private MacroTargetRequest buildMacroTargetFromTdee(BigDecimal tdee) {
        MacroTargetRequest macroReq = new MacroTargetRequest();
        macroReq.setDailyCalories(tdee);
        macroReq.setProtein(tdee.multiply(PROTEIN_RATIO).divide(KCAL_PER_G_PROTEIN, 2, RoundingMode.HALF_UP));
        macroReq.setCarb(tdee.multiply(CARB_RATIO).divide(KCAL_PER_G_CARB, 2, RoundingMode.HALF_UP));
        macroReq.setFat(tdee.multiply(FAT_RATIO).divide(KCAL_PER_G_FAT, 2, RoundingMode.HALF_UP));
        return macroReq;
    }

    private ClientStatusDto toClientStatus(PtClientMapping mapping) {
        User client = mapping.getClient();
        List<DietLog> recentLogs = dietLogRepository.findByCustomerIdAndLogDate(
                client.getId(), LocalDate.now());

        String statusColor;
        String statusLabel;
        if (recentLogs.isEmpty()) {
            statusColor = "YELLOW";
            statusLabel = "Missing Log";
        } else {
            statusColor = "GREEN";
            statusLabel = "On Track";
        }

        return ClientStatusDto.builder()
                .clientId(client.getId())
                .clientName(client.getFullName())
                .avatarUrl(client.getAvatarUrl())
                .status(statusColor)
                .statusLabel(statusLabel)
                .statusColor(statusColor)
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
                .lastLogTime("N/A")
                .avgCalories(BigDecimal.valueOf(1800.0))
                .build();
    }

    private List<MappingSessionResponse> loadMappingSessions(UUID mappingId) {
        return mappingSessionRepository.findByMappingIdOrderBySequenceAsc(mappingId).stream()
                .map(MappingSessionResponse::from)
                .toList();
    }
}
