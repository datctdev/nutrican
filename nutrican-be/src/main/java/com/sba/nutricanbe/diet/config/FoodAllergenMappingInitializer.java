package com.sba.nutricanbe.diet.config;

import com.sba.nutricanbe.diet.entity.FoodAllergenMapping;
import com.sba.nutricanbe.diet.enums.AllergenType;
import com.sba.nutricanbe.diet.repository.FoodAllergenMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@Order(5)
@RequiredArgsConstructor
public class FoodAllergenMappingInitializer implements CommandLineRunner {

    private static final Map<String, List<AllergenType>> SEED = Map.of(
            "pho", List.of(AllergenType.GLUTEN),
            "bun_dau_mam_tom", List.of(AllergenType.SEAFOOD, AllergenType.SOY),
            "ca_kho_to", List.of(AllergenType.SEAFOOD),
            "goi_cuon", List.of(AllergenType.SEAFOOD),
            "banh_mi", List.of(AllergenType.GLUTEN),
            "com_tam", List.of(AllergenType.EGG)
    );

    private final FoodAllergenMappingRepository repository;

    @Override
    public void run(String... args) {
        int upserted = 0;
        for (var entry : SEED.entrySet()) {
            if (repository.findByFoodCode(entry.getKey()).isEmpty()) {
                repository.save(FoodAllergenMapping.builder()
                        .foodCode(entry.getKey())
                        .allergens(entry.getValue())
                        .build());
                upserted++;
            }
        }
        if (upserted > 0) {
            log.info("Seeded {} food allergen mappings", upserted);
        }
    }
}
