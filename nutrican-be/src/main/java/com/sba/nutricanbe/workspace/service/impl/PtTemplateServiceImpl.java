package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.common.util.CoachingWeeks;
import com.sba.nutricanbe.diet.entity.MealPlan;
import com.sba.nutricanbe.diet.entity.MealPlanItem;
import com.sba.nutricanbe.diet.enums.MealPlanWeekBasis;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.MealPlanItemRepository;
import com.sba.nutricanbe.diet.repository.MealPlanRepository;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.workspace.dto.ApplyTemplateRequest;
import com.sba.nutricanbe.workspace.dto.CreateTemplateRequest;
import com.sba.nutricanbe.workspace.dto.TemplateResponse;
import com.sba.nutricanbe.workspace.entity.MealPlanTemplate;
import com.sba.nutricanbe.workspace.entity.MealPlanTemplateItem;
import com.sba.nutricanbe.workspace.repository.MealPlanTemplateItemRepository;
import com.sba.nutricanbe.workspace.repository.MealPlanTemplateRepository;
import com.sba.nutricanbe.workspace.service.PtTemplateService;
import com.sba.nutricanbe.workspace.service.support.PtWorkspaceAccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PtTemplateServiceImpl implements PtTemplateService {

    private final MealPlanTemplateRepository mealPlanTemplateRepository;
    private final MealPlanTemplateItemRepository mealPlanTemplateItemRepository;
    private final MealPlanRepository mealPlanRepository;
    private final MealPlanItemRepository mealPlanItemRepository;
    private final PtClientMappingRepository mappingRepository;
    private final PtWorkspaceAccessGuard accessGuard;

    @Override
    @Transactional
    public ApiResponse<TemplateResponse> saveAsTemplate(UUID ptId, CreateTemplateRequest request) {
        MealPlanTemplate template = MealPlanTemplate.builder()
                .ptId(ptId)
                .name(request.getName())
                .description(request.getDescription())
                .build();
        template = mealPlanTemplateRepository.save(template);

        if (request.getItems() != null) {
            for (CreateTemplateRequest.TemplateItemDto dto : request.getItems()) {
                MealPlanTemplateItem item = MealPlanTemplateItem.builder()
                        .templateId(template.getId())
                        .dayOffset(dto.getDayOffset())
                        .mealType(MealType.valueOf(dto.getMealType()).name())
                        .foodCode(dto.getFoodCode())
                        .freeText(dto.getFreeText())
                        .portionGrams(dto.getPortionGrams())
                        .build();
                mealPlanTemplateItemRepository.save(item);
            }
        }

        return ApiResponse.success(TemplateResponse.builder()
                .id(template.getId())
                .name(template.getName())
                .description(template.getDescription())
                .createdAt(template.getCreatedAt() != null
                        ? template.getCreatedAt().toString() : LocalDateTime.now().toString())
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<TemplateResponse>> getTemplatesByPt(UUID ptId) {
        List<TemplateResponse> list = mealPlanTemplateRepository.findByPtIdOrderByCreatedAtDesc(ptId).stream()
                .map(t -> TemplateResponse.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .description(t.getDescription())
                        .createdAt(t.getCreatedAt() != null ? t.getCreatedAt().toString() : null)
                        .build())
                .toList();
        return ApiResponse.success(list);
    }

    @Override
    @Transactional
    public ApiResponse<Void> applyTemplateToClient(UUID ptId, UUID templateId, UUID clientId, ApplyTemplateRequest request) {
        accessGuard.assertActiveMapping(ptId, clientId);
        MealPlanTemplate template = mealPlanTemplateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("MealPlanTemplate", templateId));
        if (!ptId.equals(template.getPtId())) {
            throw new UnauthorizedException("You can only apply your own meal-plan templates");
        }
        LocalDate weekStart = LocalDate.parse(request.getWeekStart());
        MealPlanWeekBasis weekBasis = resolveWeekBasis(clientId, weekStart);

        List<MealPlanTemplateItem> templateItems =
                mealPlanTemplateItemRepository.findByTemplateIdOrderByDayOffsetAscMealTypeAsc(templateId);

        MealPlan plan = mealPlanRepository.findByClientIdOrderByWeekStartDesc(clientId).stream()
                .filter(p -> p.getWeekStart().equals(weekStart))
                .findFirst()
                .orElseGet(() -> {
                    MealPlan newPlan = MealPlan.builder()
                            .clientId(clientId)
                            .ptId(ptId)
                            .weekStart(weekStart)
                            .weekBasis(weekBasis)
                            .build();
                    return mealPlanRepository.save(newPlan);
                });

        plan.setPtId(ptId);
        plan.setWeekBasis(weekBasis);
        plan = mealPlanRepository.save(plan);

        List<MealPlanItem> existingItems = mealPlanItemRepository
                .findByMealPlanIdOrderByPlanDateAscMealTypeAsc(plan.getId());
        if (existingItems.stream().anyMatch(item -> Boolean.TRUE.equals(item.getEaten()))) {
            throw new BadRequestException(
                    "Cannot apply a template while the plan contains items already marked as eaten");
        }

        mealPlanItemRepository.deleteByMealPlanId(plan.getId());

        for (MealPlanTemplateItem tItem : templateItems) {
            LocalDate planDate = weekStart.plusDays(tItem.getDayOffset());
            MealPlanItem item = MealPlanItem.builder()
                    .mealPlanId(plan.getId())
                    .planDate(planDate)
                    .mealType(MealType.valueOf(tItem.getMealType()))
                    .foodCode(tItem.getFoodCode())
                    .freeText(tItem.getFreeText())
                    .portionGrams(tItem.getPortionGrams())
                    .note(tItem.getNote())
                    .build();
            mealPlanItemRepository.save(item);
        }

        return ApiResponse.success(null, "Template applied successfully");
    }

    /** Same dual-write rule as MealPlanAuthoringServiceImpl: coaching boundary → COACHING. */
    private MealPlanWeekBasis resolveWeekBasis(UUID clientId, LocalDate weekStart) {
        LocalDateTime startedAt = mappingRepository.findByClient_Id(clientId, PageRequest.of(0, 20)).stream()
                .filter(m -> m.getStatus() == ClientMappingStatus.ACTIVE
                        || m.getStatus() == ClientMappingStatus.END_REQUESTED)
                .map(PtClientMapping::getCoachingStartedAt)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        if (startedAt != null && CoachingWeeks.isBoundary(startedAt.toLocalDate(), weekStart)) {
            return MealPlanWeekBasis.COACHING;
        }
        return MealPlanWeekBasis.MONDAY;
    }
}
