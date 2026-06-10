package com.sba.nutrican_be.diet.service;

import com.sba.nutrican_be.core.entity.FoodItem;
import com.sba.nutrican_be.core.exception.ResourceNotFoundException;
import com.sba.nutrican_be.core.repository.FoodItemRepository;
import com.sba.nutrican_be.diet.dto.FoodItemResponse;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoodCatalogServiceImpl implements FoodCatalogService {

    private static final String HOTPOT_BROTH = "HOTPOT_BROTH";
    private static final String HOTPOT_ITEM = "HOTPOT_ITEM";

    private final FoodItemRepository foodItemRepository;

    @PostConstruct
    @Transactional
    public void seedIfEmpty() {
        if (foodItemRepository.count() > 0) {
            seedV2IfMissing();
            return;
        }
        log.info("Seeding food_items catalog...");
        List<FoodItem> items = buildSeedData();
        foodItemRepository.saveAll(items);
        log.info("Seeded {} food items", items.size());
        seedV2IfMissing();
    }

    private void seedV2IfMissing() {
        List<FoodItem> v2 = buildSeedDataV2();
        int added = 0;
        for (FoodItem candidate : v2) {
            boolean exists = foodItemRepository.findAll().stream()
                    .anyMatch(f -> f.getNameVi().equalsIgnoreCase(candidate.getNameVi()));
            if (!exists) {
                foodItemRepository.save(candidate);
                added++;
            }
        }
        if (added > 0) {
            log.info("Seeded v2 food items: {}", added);
        }
    }

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

    private List<FoodItem> buildSeedData() {
        List<FoodItem> items = new ArrayList<>();
        items.add(food("Phở bò", "Beef pho", List.of("pho bo", "phở"), "SOUP", 500, 450, 25, 55, 12));
        items.add(food("Bún bò Huế", "Hue beef noodle", List.of("bun bo hue"), "SOUP", 500, 480, 28, 58, 14));
        items.add(food("Cơm tấm sườn", "Broken rice with pork rib", List.of("com tam"), "RICE", 450, 620, 30, 75, 20));
        items.add(food("Bánh mì thịt", "Vietnamese sandwich", List.of("banh mi"), "BREAD", 200, 380, 15, 45, 14));
        items.add(food("Gỏi cuốn", "Fresh spring roll", List.of("goi cuon"), "APPETIZER", 80, 120, 6, 18, 2));
        items.add(food("Bún chả", "Grilled pork with noodles", List.of("bun cha"), "NOODLE", 400, 520, 28, 60, 16));
        items.add(food("Cơm gà", "Chicken rice", List.of("com ga"), "RICE", 400, 550, 32, 65, 15));
        items.add(food("Bún thịt nướng", "Grilled pork noodle", List.of("bun thit nuong"), "NOODLE", 450, 500, 26, 62, 14));
        items.add(food("Hủ tiếu Nam Vang", "Nam Vang noodle soup", List.of("hu tieu"), "SOUP", 450, 420, 22, 55, 10));
        items.add(food("Chả giò", "Fried spring roll", List.of("cha gio"), "APPETIZER", 100, 250, 8, 22, 14));

        items.add(food("Lẩu Thái", "Thai hotpot broth", List.of("lau thai", "tom yum"), HOTPOT_BROTH, 300, 180, 8, 12, 10));
        items.add(food("Lẩu bò", "Beef hotpot broth", List.of("lau bo"), HOTPOT_BROTH, 300, 200, 10, 8, 12));
        items.add(food("Lẩu hải sản", "Seafood hotpot broth", List.of("lau hai san"), HOTPOT_BROTH, 300, 160, 6, 10, 8));
        items.add(food("Lẩu nấm", "Mushroom hotpot broth", List.of("lau nam"), HOTPOT_BROTH, 300, 140, 5, 12, 6));

        items.add(food("Thịt bò nhúng lẩu", "Hotpot beef slices", List.of("bo nhung"), HOTPOT_ITEM, 100, 180, 18, 2, 10));
        items.add(food("Tôm sú", "Tiger prawn", List.of("tom su"), HOTPOT_ITEM, 80, 90, 18, 1, 1));
        items.add(food("Mực tươi", "Fresh squid", List.of("muc"), HOTPOT_ITEM, 100, 110, 20, 3, 2));
        items.add(food("Nấm kim châm", "Enoki mushroom", List.of("nam kim cham"), HOTPOT_ITEM, 80, 40, 3, 6, 0));
        items.add(food("Rau muống", "Water spinach", List.of("rau muong"), HOTPOT_ITEM, 100, 25, 2, 4, 0));
        items.add(food("Đậu hũ", "Tofu", List.of("dau hu", "tofu"), HOTPOT_ITEM, 100, 120, 10, 4, 7));
        items.add(food("Mì gói", "Instant noodles", List.of("mi goi"), HOTPOT_ITEM, 80, 350, 8, 48, 14));
        items.add(food("Cá viên", "Fish ball", List.of("ca vien"), HOTPOT_ITEM, 50, 90, 8, 6, 4));

        items.add(food("Trà đá", "Iced tea", List.of("tra da"), "DRINK", 300, 5, 0, 1, 0));
        items.add(food("Cà phê sữa đá", "Vietnamese iced coffee", List.of("ca phe sua da"), "DRINK", 250, 120, 2, 18, 4));
        items.add(food("Sinh tố bơ", "Avocado smoothie", List.of("sinh to bo"), "DRINK", 350, 280, 4, 35, 16));
        return items;
    }

    private List<FoodItem> buildSeedDataV2() {
        List<FoodItem> items = new ArrayList<>();
        items.add(food("Bún riêu cua", "Crab noodle soup", List.of("bun rieu"), "SOUP", 450, 420, 22, 55, 12));
        items.add(food("Mì Quảng", "Quang noodles", List.of("mi quang"), "NOODLE", 400, 480, 24, 58, 16));
        items.add(food("Cơm rang dưa bò", "Beef fried rice", List.of("com rang"), "RICE", 400, 580, 26, 72, 18));
        items.add(food("Bánh xèo", "Vietnamese crepe", List.of("banh xeo"), "STREET_FOOD", 250, 420, 14, 45, 20));
        items.add(food("Nem nướng", "Grilled pork skewers", List.of("nem nuong"), "STREET_FOOD", 150, 320, 22, 8, 24));
        items.add(food("Bánh cuốn", "Steamed rice rolls", List.of("banh cuon"), "APPETIZER", 200, 280, 12, 42, 6));
        items.add(food("Xôi gà", "Chicken sticky rice", List.of("xoi ga"), "RICE", 300, 450, 20, 65, 12));
        items.add(food("Bò kho", "Beef stew", List.of("bo kho"), "SOUP", 400, 520, 32, 40, 22));
        items.add(food("Canh chua cá", "Sour fish soup", List.of("canh chua"), "SOUP", 400, 280, 24, 18, 8));
        items.add(food("Gà rán", "Fried chicken", List.of("ga ran"), "STREET_FOOD", 200, 480, 28, 22, 30));
        items.add(food("Salad rau củ", "Vegetable salad", List.of("salad"), "APPETIZER", 200, 120, 4, 18, 4));
        items.add(food("Pizza slice", "Pizza slice", List.of("pizza"), "BUFFET_ITEM", 120, 285, 12, 32, 12));
        items.add(food("Sushi roll", "Sushi roll", List.of("sushi"), "BUFFET_ITEM", 80, 140, 6, 22, 3));
        items.add(food("Ba chỉ heo", "Pork belly", List.of("ba chi"), "BUFFET_ITEM", 100, 450, 12, 0, 42));
        items.add(food("Cá hồi nướng", "Grilled salmon", List.of("ca hoi"), "BUFFET_ITEM", 150, 280, 32, 0, 18));
        items.add(food("Khoai tây chiên", "French fries", List.of("khoai tay"), "BUFFET_ITEM", 100, 320, 4, 42, 16));
        items.add(food("Trứng luộc", "Boiled egg", List.of("trung"), "BUFFET_ITEM", 50, 78, 6, 1, 5));
        items.add(food("Dưa hấu", "Watermelon", List.of("dua hau"), "BUFFET_ITEM", 200, 60, 1, 15, 0));
        items.add(food("Chè đậu đỏ", "Red bean dessert", List.of("che"), "DRINK", 250, 220, 6, 42, 2));
        items.add(food("Bia lon", "Beer can", List.of("bia"), "DRINK", 330, 145, 1, 12, 0));
        items.add(food("Bánh tráng trộn", "Rice paper salad", List.of("banh trang"), "STREET_FOOD", 200, 380, 10, 55, 12));
        items.add(food("Hủ tiếu khô", "Dry rice noodle", List.of("hu tieu kho"), "NOODLE", 400, 490, 22, 68, 14));
        items.add(food("Cơm chiên hải sản", "Seafood fried rice", List.of("com chien"), "RICE", 400, 560, 24, 70, 18));
        items.add(food("Lẩu cua đồng", "Field crab hotpot", List.of("lau cua"), HOTPOT_BROTH, 300, 190, 12, 10, 10));
        items.add(food("Bò viên", "Beef ball", List.of("bo vien"), HOTPOT_ITEM, 50, 110, 10, 4, 6));
        items.add(food("Tôm tít", "Mantis shrimp", List.of("tom tit"), HOTPOT_ITEM, 80, 95, 19, 1, 1));
        items.add(food("Bánh flan", "Caramel custard", List.of("flan"), "BUFFET_ITEM", 100, 180, 5, 28, 5));
        items.add(food("Kem vanilla", "Vanilla ice cream", List.of("kem"), "BUFFET_ITEM", 80, 150, 3, 18, 8));
        items.add(food("Gà nướng mật ong", "Honey grilled chicken", List.of("ga nuong"), "BUFFET_ITEM", 150, 320, 28, 8, 18));
        items.add(food("Mì Ý sốt bò", "Beef pasta", List.of("mi y"), "BUFFET_ITEM", 300, 520, 22, 62, 16));
        items.add(food("Cháo lòng", "Pork organ porridge", List.of("chao long"), "SOUP", 400, 350, 18, 42, 10));
        items.add(food("Bún mắm", "Fermented fish noodle", List.of("bun mam"), "NOODLE", 450, 460, 20, 58, 14));
        items.add(food("Cơm tấm bì chả", "Broken rice with pork skin", List.of("com tam bi"), "RICE", 450, 640, 28, 72, 22));
        return items;
    }

    private FoodItem food(String nameVi, String nameEn, List<String> aliases, String category,
                          int servingG, int cal, int pro, int carb, int fat) {
        return FoodItem.builder()
                .nameVi(nameVi)
                .nameEn(nameEn)
                .aliases(aliases)
                .category(category)
                .servingSizeG(BigDecimal.valueOf(servingG))
                .calories(BigDecimal.valueOf(cal))
                .protein(BigDecimal.valueOf(pro))
                .carb(BigDecimal.valueOf(carb))
                .fat(BigDecimal.valueOf(fat))
                .isComposite(HOTPOT_BROTH.equals(category) || HOTPOT_ITEM.equals(category))
                .source("INTERNAL_SEED")
                .build();
    }
}
