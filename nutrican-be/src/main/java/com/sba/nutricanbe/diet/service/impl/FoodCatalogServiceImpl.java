package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutricanbe.ai.catalog.ResNetFoodDefaults;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.dto.response.FoodItemResponse;
import com.sba.nutricanbe.diet.enums.FoodCategoryGroup;
import com.sba.nutricanbe.diet.util.FoodCategoryGroups;
import com.sba.nutricanbe.diet.service.DietPrefCheckService;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.DietPreference;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FoodCatalogServiceImpl implements FoodCatalogService {

    private static final String HOTPOT_BROTH = "HOTPOT_BROTH";
    private static final String HOTPOT_ITEM = "HOTPOT_ITEM";

    private final FoodItemRepository foodItemRepository;
    private final DietPrefCheckService dietPrefCheckService;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<FoodItemResponse> search(String query, String category, boolean dietFilter, UUID userId) {
        return search(query, category, null, dietFilter, userId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FoodItemResponse> search(String query, String category, boolean dietFilter, UUID userId, Integer limit) {
        return search(query, category, null, dietFilter, userId, limit);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FoodItemResponse> search(
            String query, String category, String categoryGroup, boolean dietFilter, UUID userId, Integer limit) {
        DietPreference preference = resolvePreference(userId);
        boolean applyFilter = dietFilter && preference != null && preference != DietPreference.NORMAL;
        FoodCategoryGroup group = FoodCategoryGroups.parseParam(categoryGroup);

        List<FoodItemResponse> results;
        if (query == null || query.isBlank()) {
            List<FoodItem> items = category != null
                    ? foodItemRepository.findByCategoryOrderByNameViAsc(category)
                    : foodItemRepository.findAll();
            results = items.stream()
                    .filter(f -> group == null || FoodCategoryGroups.resolve(f.getCategory()) == group)
                    .sorted(Comparator.comparing(FoodItem::getNameVi, Comparator.nullsLast(String::compareToIgnoreCase)))
                    .map(this::toResponse)
                    .collect(Collectors.toList());
            if (applyFilter) {
                DietPreference pref = preference;
                results = results.stream()
                        .filter(r -> dietPrefCheckService.matchesPreference(pref, r.getDietTags()))
                        .collect(Collectors.toList());
            }
            if (limit != null && limit > 0) {
                results = results.stream().limit(limit).collect(Collectors.toList());
            }
        } else {
            String normalizedQuery = normalize(query);
            List<FoodItem> items = foodItemRepository.searchByName(query.trim());
            int cap = (limit != null && limit > 0) ? Math.min(limit, 20) : 20;
            results = items.stream()
                    .filter(f -> category == null || category.equals(f.getCategory()))
                    .filter(f -> group == null || FoodCategoryGroups.resolve(f.getCategory()) == group)
                    .filter(f -> matchesQuery(f, normalizedQuery))
                    .sorted(Comparator.comparing(FoodItem::getNameVi))
                    .limit(cap)
                    .map(this::toResponse)
                    .collect(Collectors.toList());
            if (applyFilter) {
                DietPreference pref = preference;
                results = results.stream()
                        .filter(r -> dietPrefCheckService.matchesPreference(pref, r.getDietTags()))
                        .collect(Collectors.toList());
            }
        }
        if (preference != null && preference != DietPreference.NORMAL) {
            DietPreference pref = preference;
            results = results.stream()
                    .map(r -> {
                        boolean mismatch = !dietPrefCheckService.matchesPreference(pref, r.getDietTags());
                        r.setPrefMismatch(mismatch);
                        return r;
                    })
                    .collect(Collectors.toList());
        }
        return results;
    }

    private DietPreference resolvePreference(UUID userId) {
        if (userId == null) {
            return DietPreference.NORMAL;
        }
        return userRepository.findById(userId)
                .map(User::getDietPreference)
                .orElse(DietPreference.NORMAL);
    }

    @Override
    @Transactional(readOnly = true)
    public FoodItemResponse getById(UUID id) {
        return foodItemRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("FoodItem", id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FoodItemResponse> getHotpotBroths() {
        return foodItemRepository.findByCategoryOrderByNameViAsc(HOTPOT_BROTH).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FoodItemResponse> getHotpotItems() {
        return foodItemRepository.findByCategoryOrderByNameViAsc(HOTPOT_ITEM).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FoodItemResponse> getByCodes(List<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return List.of();
        }

        Map<String, FoodItem> foodsByCode = new LinkedHashMap<>();
        for (FoodItem food : foodItemRepository.findAll()) {
            if (food.getFoodCode() != null && !food.getFoodCode().isBlank()) {
                foodsByCode.putIfAbsent(normalizeCode(food.getFoodCode()), food);
            }
            if (food.getAliases() != null) {
                food.getAliases().stream()
                        .filter(alias -> alias != null && !alias.isBlank())
                        .forEach(alias -> foodsByCode.putIfAbsent(normalizeCode(alias), food));
            }
        }

        return codes.stream()
                .filter(Objects::nonNull)
                .map(this::normalizeCode)
                .map(foodsByCode::get)
                .filter(Objects::nonNull)
                .distinct()
                .map(this::toResponse)
                .toList();
    }

    private String normalizeCode(String code) {
        return code.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FoodItemResponse> findBestMatch(String foodName) {
        if (foodName == null || foodName.isBlank()) {
            return Optional.empty();
        }
        return findMatches(foodName, 1).stream().findFirst();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FoodItemResponse> findByResNetFoodCode(String foodCode) {
        if (foodCode == null || foodCode.isBlank()) {
            return Optional.empty();
        }
        String code = normalizeCode(foodCode);

        Optional<FoodItemResponse> byCode = foodItemRepository.findAll().stream()
                .filter(f -> (f.getFoodCode() != null && code.equals(normalizeCode(f.getFoodCode())))
                        || (f.getAliases() != null && f.getAliases().stream()
                        .filter(Objects::nonNull)
                        .anyMatch(alias -> code.equals(normalizeCode(alias)))))
                .findFirst()
                .map(this::toResponse);
        if (byCode.isPresent()) {
            return byCode;
        }

        return ResNetFoodCodeMapping.catalogNameVi(code)
                .flatMap(nameVi -> foodItemRepository.findAll().stream()
                        .filter(f -> nameVi.equalsIgnoreCase(f.getNameVi())
                                || (f.getAliases() != null && f.getAliases().stream()
                                .anyMatch(a -> code.equals(a.toLowerCase(Locale.ROOT)))))
                        .findFirst()
                        .map(this::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FoodItemResponse> getResNetDishes() {
        List<FoodItemResponse> fromDb = foodItemRepository.findAll().stream()
                .filter(f -> ResNetFoodDefaults.SOURCE.equals(f.getSource()))
                .sorted(Comparator.comparing(FoodItem::getNameVi))
                .map(this::toResponse)
                .collect(Collectors.toList());
        if (!fromDb.isEmpty()) {
            return fromDb;
        }
        return ResNetFoodCodeMapping.classOrder().stream()
                .map(code -> {
                    var macros = ResNetFoodDefaults.scaledMacros(code, java.math.BigDecimal.ONE);
                    return FoodItemResponse.builder()
                            .nameVi(ResNetFoodCodeMapping.catalogNameViOrDisplay(code, code))
                            .nameEn(code.replace('_', ' '))
                            .foodCode(code)
                            .category("Món ResNet50")
                            .categoryGroup(FoodCategoryGroup.OTHER.name())
                            .categoryGroupLabel(FoodCategoryGroup.OTHER.getLabelVi())
                            .servingSizeG(ResNetFoodDefaults.defaultServingG(code))
                            .calories(macros.get("calories"))
                            .protein(macros.get("protein"))
                            .carb(macros.get("carbs"))
                            .fat(macros.get("fat"))
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FoodItemResponse> findMatches(String foodName, int limit) {
        String normalized = normalize(foodName);
        return foodItemRepository.findAll().stream()
                .filter(f -> matchesQuery(f, normalized))
                .sorted(Comparator.comparingInt(f -> -scoreMatch(f, normalized)))
                .limit(limit)
                .map(f -> toResponse(f, scoreMatch(f, normalized)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public int getMatchScore(String foodName, UUID foodItemId) {
        if (foodName == null || foodItemId == null) {
            return 0;
        }
        return foodItemRepository.findById(foodItemId)
                .map(f -> scoreMatch(f, normalize(foodName)))
                .orElse(0);
    }

    private boolean matchesQuery(FoodItem item, String normalizedQuery) {
        if (normalizedQuery.isBlank()) {
            return true;
        }
        return scoreMatch(item, normalizedQuery) > 0;
    }

    private int scoreMatch(FoodItem item, String normalizedQuery) {
        int score = 0;
        if (normalize(item.getNameVi()).contains(normalizedQuery)) score += 10;
        if (item.getNameEn() != null && normalize(item.getNameEn()).contains(normalizedQuery)) score += 8;
        if (item.getAliases() != null) {
            for (String alias : item.getAliases()) {
                if (normalize(alias).contains(normalizedQuery)) score += 6;
            }
        }
        return score;
    }

    private String normalize(String text) {
        if (text == null) return "";
        String n = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
        return n;
    }

    private FoodItemResponse toResponse(FoodItem item) {
        return toResponse(item, null);
    }

    private FoodItemResponse toResponse(FoodItem item, Integer matchScore) {
        FoodCategoryGroup group = FoodCategoryGroups.resolve(item.getCategory());
        return FoodItemResponse.builder()
                .id(item.getId())
                .nameVi(item.getNameVi())
                .nameEn(item.getNameEn())
                .foodCode(item.getFoodCode())
                .aliases(item.getAliases())
                .category(item.getCategory())
                .categoryGroup(group.name())
                .categoryGroupLabel(group.getLabelVi())
                .servingSizeG(item.getServingSizeG())
                .calories(item.getCalories())
                .protein(item.getProtein())
                .carb(item.getCarb())
                .fat(item.getFat())
                .matchScore(matchScore)
                .dietTags(item.getDietTags())
                .allergens(item.getAllergens())
                .build();
    }
}

