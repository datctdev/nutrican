package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.dto.request.FoodTagUpdateRequest;
import com.sba.nutricanbe.diet.dto.response.FoodTagDto;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.enums.DietTag;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.diet.service.FoodDietTagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FoodDietTagServiceImpl implements FoodDietTagService {

    private static final int MAX_ROWS = 500;

    private final FoodItemRepository foodItemRepository;
    private final FoodCatalogService foodCatalogService;

    @Override
    @Transactional(readOnly = true)
    public List<FoodTagDto> listTaggedFoods() {
        return foodItemRepository.findAll().stream()
                .filter(f -> f.getAliases() != null && !f.getAliases().isEmpty())
                .map(f -> FoodTagDto.builder()
                        .foodItemId(f.getId())
                        .foodCode(primaryCode(f))
                        .nameVi(f.getNameVi())
                        .dietTags(f.getDietTags())
                        .build())
                .limit(MAX_ROWS)
                .toList();
    }

    @Override
    @Transactional
    public FoodTagDto updateTags(String foodCode, FoodTagUpdateRequest request) {
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
        return FoodTagDto.builder()
                .foodItemId(item.getId())
                .foodCode(foodCode.toLowerCase(Locale.ROOT))
                .nameVi(item.getNameVi())
                .dietTags(item.getDietTags())
                .build();
    }

    private Optional<FoodItem> resolveFoodItem(String foodCode) {
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
}
