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
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Seeds / updates 10 ResNet50 dish entries for A1.1 hybrid Food DB matching.
 */
@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class ResNetFoodCatalogInitializer implements CommandLineRunner {

    private static final String CATEGORY = "Món ResNet50";

    private final FoodItemRepository foodItemRepository;

    @Override
    @Transactional
    public void run(String... args) {
        int upserted = 0;
        for (Map.Entry<String, String> entry : ResNetFoodCodeMapping.allMappings().entrySet()) {
            String code = entry.getKey();
            String nameVi = entry.getValue();
            Optional<ResNetFoodDefaults.MacroServing> defaults = ResNetFoodDefaults.forCode(code);
            if (defaults.isEmpty()) {
                continue;
            }
            ResNetFoodDefaults.MacroServing m = defaults.get();
            List<String> aliases = buildAliases(code);

            Optional<FoodItem> existing = findExisting(code, nameVi);
            if (existing.isPresent()) {
                FoodItem item = existing.get();
                item.setNameVi(nameVi);
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
        if (upserted > 0) {
            log.info("Upserted {} ResNet50 dish catalog entries", upserted);
        }
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

    private Optional<FoodItem> findExisting(String code, String nameVi) {
        return foodItemRepository.findAll().stream()
                .filter(f -> ResNetFoodDefaults.SOURCE.equals(f.getSource())
                        || "RESNET_VTN_10".equals(f.getSource())
                        || (f.getAliases() != null && f.getAliases().stream()
                        .anyMatch(a -> code.equalsIgnoreCase(a.trim()))))
                .filter(f -> ResNetFoodDefaults.SOURCE.equals(f.getSource())
                        || "RESNET_VTN_10".equals(f.getSource())
                        || nameVi.equalsIgnoreCase(f.getNameVi())
                        || (f.getAliases() != null && f.getAliases().contains(code)))
                .findFirst();
    }
}

