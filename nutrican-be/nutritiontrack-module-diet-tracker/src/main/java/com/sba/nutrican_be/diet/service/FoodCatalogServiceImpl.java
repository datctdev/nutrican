package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.core.entity.FoodItem;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.FoodItemRepository;
import com.sba.nutrican_be.diet.dto.FoodItemResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FoodCatalogServiceImpl implements FoodCatalogService {

    private static final String HOTPOT_BROTH = "HOTPOT_BROTH";
    private static final String HOTPOT_ITEM = "HOTPOT_ITEM";

    private final FoodItemRepository foodItemRepository;

    @Override
    @Transactional(readOnly = true)
    public List<FoodItemResponse> search(String query, String category) {
        List<FoodItem> results;
        if (query == null || query.isBlank()) {
            results = category != null
                    ? foodItemRepository.findByCategoryOrderByNameViAsc(category)
                    : foodItemRepository.findAll();
        } else {
            String normalizedQuery = normalize(query);
            results = foodItemRepository.searchByName(query.trim());
            results = results.stream()
                    .filter(f -> category == null || category.equals(f.getCategory()))
                    .filter(f -> matchesQuery(f, normalizedQuery))
                    .sorted(Comparator.comparing(FoodItem::getNameVi))
                    .limit(20)
                    .collect(Collectors.toList());
        }
        return results.stream().map(this::toResponse).collect(Collectors.toList());
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
    public Optional<FoodItemResponse> findBestMatch(String foodName) {
        if (foodName == null || foodName.isBlank()) {
            return Optional.empty();
        }
        return findMatches(foodName, 1).stream().findFirst();
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
        return FoodItemResponse.builder()
                .id(item.getId())
                .nameVi(item.getNameVi())
                .nameEn(item.getNameEn())
                .aliases(item.getAliases())
                .category(item.getCategory())
                .servingSizeG(item.getServingSizeG())
                .calories(item.getCalories())
                .protein(item.getProtein())
                .carb(item.getCarb())
                .fat(item.getFat())
                .matchScore(matchScore)
                .build();
    }
}
