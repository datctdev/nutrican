package com.sba.nutrican_be.diet.config;

import com.sba.nutrican_be.ai.catalog.ResNetFoodCodeMapping;
import com.sba.nutrican_be.ai.catalog.ResNetFoodDefaults;
import com.sba.nutrican_be.core.entity.FoodItem;
import com.sba.nutrican_be.core.repository.FoodItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Seeds / updates 10 ResNet50 dish entries for A1.1 hybrid Food DB matching.
 * Source column value: {@link ResNetFoodDefaults#SOURCE} (= {@code NUTRIHOME_PDF}).
 */
@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class ResNetFoodCatalogInitializer implements CommandLineRunner {

    private static final String CATEGORY = "Món ResNet50";
    private static final List<String> LEGACY_SOURCES = List.of("RESNET_VTN_10");

    private final FoodItemRepository foodItemRepository;

    @Override
    @Transactional
    public void run(String... args) {
        int upserted = 0;
        int skipped = 0;
        Map<String, String> mappings = ResNetFoodCodeMapping.allMappings();
        log.info("ResNet50 catalog seed: {} dish codes to upsert (source={})", mappings.size(), ResNetFoodDefaults.SOURCE);

        for (Map.Entry<String, String> entry : mappings.entrySet()) {
            String code = entry.getKey();
            String nameVi = entry.getValue();
            Optional<ResNetFoodDefaults.MacroServing> defaults = ResNetFoodDefaults.forCode(code);
            if (defaults.isEmpty()) {
                skipped++;
                log.warn("No macro defaults for ResNet code '{}', skipping", code);
                continue;
            }
            ResNetFoodDefaults.MacroServing m = defaults.get();
            List<String> aliases = buildAliases(code);

            Optional<FoodItem> existing = findResNetCatalogItem(code);
            if (existing.isPresent()) {
                FoodItem item = existing.get();
                item.setNameVi(nameVi);
                item.setNameEn(code.replace('_', ' '));
                item.setCategory(CATEGORY);
                item.setSource(ResNetFoodDefaults.SOURCE);
                item.setAliases(aliases);
                item.setServingSizeG(BigDecimal.valueOf(m.servingG()));
                item.setCalories(BigDecimal.valueOf(m.calories()));
                item.setProtein(BigDecimal.valueOf(m.protein()));
                item.setCarb(BigDecimal.valueOf(m.carb()));
                item.setFat(BigDecimal.valueOf(m.fat()));
                foodItemRepository.save(item);
            } else {
                FoodItem item = FoodItem.builder()
                        .nameVi(nameVi)
                        .nameEn(code.replace('_', ' '))
                        .category(CATEGORY)
                        .aliases(aliases)
                        .servingSizeG(BigDecimal.valueOf(m.servingG()))
                        .calories(BigDecimal.valueOf(m.calories()))
                        .protein(BigDecimal.valueOf(m.protein()))
                        .carb(BigDecimal.valueOf(m.carb()))
                        .fat(BigDecimal.valueOf(m.fat()))
                        .isComposite(false)
                        .source(ResNetFoodDefaults.SOURCE)
                        .build();
                foodItemRepository.save(item);
            }
            upserted++;
        }

        long nutrihomeCount = foodItemRepository.findBySource(ResNetFoodDefaults.SOURCE).size();
        log.info("ResNet50 catalog seed done: upserted={}, skipped={}, total source={} in DB={}",
                upserted, skipped, ResNetFoodDefaults.SOURCE, nutrihomeCount);
    }

    private List<String> buildAliases(String code) {
        Set<String> aliases = new LinkedHashSet<>();
        aliases.add(code);
        aliases.add(code.replace('_', ' '));
        Arrays.stream(ResNetFoodDefaults.aliasesCsv(code).split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .forEach(aliases::add);
        return new ArrayList<>(aliases);
    }

    /** Only match rows already seeded for ResNet / NutriHome — never VTN_FCT_2007 rows. */
    private Optional<FoodItem> findResNetCatalogItem(String code) {
        Optional<FoodItem> current = findBySourceAndCode(ResNetFoodDefaults.SOURCE, code);
        if (current.isPresent()) {
            return current;
        }
        for (String legacySource : LEGACY_SOURCES) {
            Optional<FoodItem> legacy = findBySourceAndCode(legacySource, code);
            if (legacy.isPresent()) {
                return legacy;
            }
        }
        return Optional.empty();
    }

    private Optional<FoodItem> findBySourceAndCode(String source, String code) {
        return foodItemRepository.findBySource(source).stream()
                .filter(item -> hasAlias(item, code))
                .findFirst();
    }

    private static boolean hasAlias(FoodItem item, String code) {
        if (item.getAliases() == null) {
            return false;
        }
        return item.getAliases().stream().anyMatch(alias -> code.equalsIgnoreCase(alias.trim()));
    }
}
