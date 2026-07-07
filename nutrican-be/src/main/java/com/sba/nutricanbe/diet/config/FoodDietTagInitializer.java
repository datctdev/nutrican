package com.sba.nutricanbe.diet.config;

import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.util.FoodDietTagHeuristics;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(25)
@RequiredArgsConstructor
@Slf4j
public class FoodDietTagInitializer implements ApplicationRunner {

    private final FoodItemRepository foodItemRepository;

    @Override
    public void run(ApplicationArguments args) {
        List<FoodItem> items = foodItemRepository.findAll();
        int updated = 0;
        for (FoodItem item : items) {
            if (item.getDietTags() != null && !item.getDietTags().isEmpty()) {
                continue;
            }
            List<String> tags = FoodDietTagHeuristics.inferTags(item.getNameVi(), item.getNameEn(), item.getCategory());
            if (!tags.isEmpty()) {
                item.setDietTags(tags);
                foodItemRepository.save(item);
                updated++;
            }
        }
        if (updated > 0) {
            log.info("Food diet tag seed: inferred tags for {} food items", updated);
        }
    }
}
