package com.sba.nutrican_be.diet.config;

import com.sba.nutrican_be.ai.ResNetFoodCodeMapping;
import com.sba.nutrican_be.core.entity.FoodItem;
import com.sba.nutrican_be.core.repository.FoodItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Seeds 10 ResNet50 dish entries for A1.1 hybrid Food DB matching (BienBan §3).
 */
@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class ResNetFoodCatalogInitializer implements CommandLineRunner {

    private static final String CATEGORY = "Món ResNet50";
    private static final String SOURCE = "RESNET_VTN_10";

    private static final Map<String, int[]> MACROS = Map.ofEntries(
            Map.entry("banh_chung", new int[]{600, 15, 65, 20}),
            Map.entry("banh_khot", new int[]{350, 12, 45, 15}),
            Map.entry("banh_mi", new int[]{400, 15, 45, 18}),
            Map.entry("banh_trang_nuong", new int[]{250, 8, 30, 10}),
            Map.entry("banh_xeo", new int[]{450, 16, 40, 22}),
            Map.entry("bun_dau_mam_tom", new int[]{550, 25, 60, 22}),
            Map.entry("ca_kho_to", new int[]{300, 20, 10, 18}),
            Map.entry("com_tam", new int[]{650, 30, 80, 25}),
            Map.entry("goi_cuon", new int[]{150, 8, 25, 2}),
            Map.entry("pho", new int[]{400, 20, 55, 12})
    );

    private final FoodItemRepository foodItemRepository;

    @Override
    @Transactional
    public void run(String... args) {
        int added = 0;
        for (Map.Entry<String, String> entry : ResNetFoodCodeMapping.allMappings().entrySet()) {
            String code = entry.getKey();
            String nameVi = entry.getValue();
            boolean exists = foodItemRepository.findAll().stream()
                    .anyMatch(f -> nameVi.equalsIgnoreCase(f.getNameVi())
                            || (SOURCE.equals(f.getSource())
                            && f.getAliases() != null
                            && f.getAliases().contains(code)));
            if (exists) {
                continue;
            }
            int[] m = MACROS.get(code);
            FoodItem item = FoodItem.builder()
                    .nameVi(nameVi)
                    .nameEn(code.replace('_', ' '))
                    .category(CATEGORY)
                    .aliases(List.of(code, code.replace('_', ' ')))
                    .servingSizeG(BigDecimal.valueOf(100))
                    .calories(BigDecimal.valueOf(m[0]))
                    .protein(BigDecimal.valueOf(m[1]))
                    .carb(BigDecimal.valueOf(m[2]))
                    .fat(BigDecimal.valueOf(m[3]))
                    .isComposite(false)
                    .source(SOURCE)
                    .build();
            foodItemRepository.save(item);
            added++;
        }
        if (added > 0) {
            log.info("Seeded {} ResNet50 dish catalog entries", added);
        }
    }
}
