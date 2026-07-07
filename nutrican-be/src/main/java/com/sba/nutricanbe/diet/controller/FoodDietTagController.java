package com.sba.nutricanbe.diet.controller;

import com.sba.nutricanbe.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.enums.DietTag;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/food-tags")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class FoodDietTagController {

    private final FoodItemRepository foodItemRepository;
    private final FoodCatalogService foodCatalogService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FoodTagDto>>> list() {
        List<FoodTagDto> rows = foodItemRepository.findAll().stream()
                .filter(f -> f.getAliases() != null && !f.getAliases().isEmpty())
                .map(f -> FoodTagDto.builder()
                        .foodItemId(f.getId())
                        .foodCode(primaryCode(f))
                        .nameVi(f.getNameVi())
                        .dietTags(f.getDietTags())
                        .build())
                .limit(500)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(rows));
    }

    @PutMapping("/{foodCode}")
    public ResponseEntity<ApiResponse<FoodTagDto>> update(
            @PathVariable String foodCode,
            @RequestBody FoodTagUpdateRequest request) {
        if (request.getDietTags() == null || request.getDietTags().isEmpty()) {
            throw new BadRequestException("At least one diet tag is required");
        }
        for (String tag : request.getDietTags()) {
            try {
                DietTag.valueOf(tag);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid diet tag: " + tag);
            }
        }
        FoodItem item = resolveFoodItem(foodCode)
                .orElseThrow(() -> new ResourceNotFoundException("FoodItem not found for code: " + foodCode));
        item.setDietTags(request.getDietTags());
        foodItemRepository.save(item);
        return ResponseEntity.ok(ApiResponse.success(FoodTagDto.builder()
                .foodItemId(item.getId())
                .foodCode(foodCode.toLowerCase(Locale.ROOT))
                .nameVi(item.getNameVi())
                .dietTags(item.getDietTags())
                .build(), "Diet tags updated"));
    }

    private java.util.Optional<FoodItem> resolveFoodItem(String foodCode) {
        String code = foodCode.trim().toLowerCase(Locale.ROOT);
        return foodCatalogService.findByResNetFoodCode(code)
                .flatMap(f -> foodItemRepository.findById(f.getId()))
                .or(() -> foodItemRepository.findAll().stream()
                        .filter(f -> f.getAliases() != null && f.getAliases().stream()
                                .anyMatch(a -> code.equals(a.toLowerCase(Locale.ROOT))))
                        .findFirst());
    }

    private String primaryCode(FoodItem item) {
        if (item.getAliases() != null && !item.getAliases().isEmpty()) {
            return item.getAliases().get(0);
        }
        return ResNetFoodCodeMapping.catalogNameVi(item.getNameVi()).orElse(item.getNameVi());
    }

    @Data
    public static class FoodTagUpdateRequest {
        private List<String> dietTags;
    }

    @lombok.Data
    @lombok.Builder
    public static class FoodTagDto {
        private UUID foodItemId;
        private String foodCode;
        private String nameVi;
        private List<String> dietTags;
    }
}
