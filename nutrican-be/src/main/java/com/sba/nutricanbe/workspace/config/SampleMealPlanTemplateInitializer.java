package com.sba.nutricanbe.workspace.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.enums.MealType;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.workspace.entity.MealPlanTemplate;
import com.sba.nutricanbe.workspace.entity.MealPlanTemplateItem;
import com.sba.nutricanbe.workspace.repository.MealPlanTemplateItemRepository;
import com.sba.nutricanbe.workspace.repository.MealPlanTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

@Slf4j
@Component
@Order(30)
@RequiredArgsConstructor
public class SampleMealPlanTemplateInitializer implements CommandLineRunner {

    private static final String DATASET_PATH = "data/sample_meal_plan_templates.json";

    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final FoodItemRepository foodItemRepository;
    private final MealPlanTemplateRepository templateRepository;
    private final MealPlanTemplateItemRepository templateItemRepository;

    @Override
    @Transactional
    public void run(String... args) {
        SampleMealPlanDataset dataset = readDataset();
        Set<String> availableFoodCodes = loadAvailableFoodCodes();
        Map<String, MealSetSeed> mealSets = validateDataset(dataset, availableFoodCodes);

        List<User> pts = userRepository.findAll().stream()
                .filter(user -> user.getRole() == UserRole.PT_CERTIFIED
                        || user.getRole() == UserRole.PT_FREELANCE)
                .toList();

        int syncedTemplates = 0;
        int syncedItems = 0;
        for (User pt : pts) {
            for (TemplateSeed seed : dataset.templates()) {
                syncedItems += syncTemplate(pt.getId(), seed, mealSets);
                syncedTemplates++;
            }
        }

        log.info("Healthy meal-plan seed: synced {} templates and {} items for {} PT accounts",
                syncedTemplates, syncedItems, pts.size());
    }

    private SampleMealPlanDataset readDataset() {
        ClassPathResource resource = new ClassPathResource(DATASET_PATH);
        try (InputStream input = resource.getInputStream()) {
            return objectMapper.readValue(input, SampleMealPlanDataset.class);
        } catch (IOException exception) {
            throw new IllegalStateException("Cannot read sample meal-plan dataset: " + DATASET_PATH, exception);
        }
    }

    private Set<String> loadAvailableFoodCodes() {
        Set<String> codes = new HashSet<>();
        for (FoodItem food : foodItemRepository.findAll()) {
            if (food.getFoodCode() != null && !food.getFoodCode().isBlank()) {
                codes.add(normalizeCode(food.getFoodCode()));
            }
            if (food.getAliases() != null) {
                food.getAliases().stream()
                        .filter(alias -> alias != null && !alias.isBlank())
                        .map(this::normalizeCode)
                        .forEach(codes::add);
            }
        }
        return codes;
    }

    private Map<String, MealSetSeed> validateDataset(
            SampleMealPlanDataset dataset,
            Set<String> availableFoodCodes) {
        if (dataset.mealSets() == null || dataset.mealSets().isEmpty()) {
            throw new IllegalStateException("Healthy meal-plan dataset must contain meal sets");
        }
        if (dataset.templates() == null || dataset.templates().isEmpty()) {
            throw new IllegalStateException("Healthy meal-plan dataset must contain templates");
        }

        Map<String, MealSetSeed> mealSets = new LinkedHashMap<>();
        for (MealSetSeed mealSet : dataset.mealSets()) {
            if (mealSet.key() == null || mealSet.key().isBlank()
                    || mealSets.putIfAbsent(mealSet.key(), mealSet) != null) {
                throw new IllegalStateException("Meal-set keys must be present and unique");
            }
            parseMealType(mealSet.mealType(), mealSet.key());
            if (mealSet.items() == null || mealSet.items().isEmpty()) {
                throw new IllegalStateException("Meal set has no food items: " + mealSet.key());
            }
            for (ItemSeed item : mealSet.items()) {
                if (item.foodCode() == null
                        || !availableFoodCodes.contains(normalizeCode(item.foodCode()))) {
                    throw new IllegalStateException("Unknown foodCode '" + item.foodCode()
                            + "' in meal set: " + mealSet.key());
                }
                if (item.portionGrams() == null || item.portionGrams().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalStateException("portionGrams must be positive in meal set: " + mealSet.key());
                }
            }
        }

        Set<String> templateNames = new HashSet<>();
        for (TemplateSeed template : dataset.templates()) {
            if (template.name() == null || template.name().isBlank() || !templateNames.add(template.name())) {
                throw new IllegalStateException("Template names must be present and unique");
            }
            if (template.days() == null || template.days().size() != 7) {
                throw new IllegalStateException("Template must define exactly 7 days: " + template.name());
            }

            Set<Integer> dayOffsets = new HashSet<>();
            int cheatMealCount = 0;
            for (DaySeed day : template.days()) {
                if (day.dayOffset() < 0 || day.dayOffset() > 6 || !dayOffsets.add(day.dayOffset())) {
                    throw new IllegalStateException("Template day offsets must be unique from 0 to 6: "
                            + template.name());
                }
                if (day.meals() == null || day.meals().isEmpty()) {
                    throw new IllegalStateException("Template day has no meals: " + template.name());
                }
                EnumSet<MealType> coveredMealTypes = EnumSet.noneOf(MealType.class);
                for (String mealKey : day.meals()) {
                    MealSetSeed mealSet = mealSets.get(mealKey);
                    if (mealSet == null) {
                        throw new IllegalStateException("Unknown meal set '" + mealKey
                                + "' in template: " + template.name());
                    }
                    MealType mealType = parseMealType(mealSet.mealType(), mealSet.key());
                    if (!coveredMealTypes.add(mealType)) {
                        throw new IllegalStateException("Duplicate " + mealType + " on day "
                                + day.dayOffset() + " in template: " + template.name());
                    }
                    if (mealSet.cheatMeal()) {
                        cheatMealCount++;
                    }
                }
                if (!coveredMealTypes.equals(EnumSet.allOf(MealType.class))) {
                    throw new IllegalStateException("Every day must contain breakfast, lunch, dinner and snack: "
                            + template.name());
                }
            }
            if (cheatMealCount < 1 || cheatMealCount > 2) {
                throw new IllegalStateException("Template must contain only 1-2 cheat meals: " + template.name());
            }
        }
        return mealSets;
    }

    private int syncTemplate(UUID ptId, TemplateSeed seed, Map<String, MealSetSeed> mealSets) {
        MealPlanTemplate template = templateRepository.findByPtIdAndName(ptId, seed.name())
                .orElseGet(() -> MealPlanTemplate.builder()
                        .ptId(ptId)
                        .name(seed.name())
                        .build());
        template.setDescription(seed.description());
        template = templateRepository.save(template);

        templateItemRepository.deleteByTemplateId(template.getId());
        MealPlanTemplate savedTemplate = template;
        List<MealPlanTemplateItem> items = seed.days().stream()
                .flatMap(day -> day.meals().stream()
                        .map(mealSets::get)
                        .flatMap(mealSet -> IntStream.range(0, mealSet.items().size())
                                .mapToObj(index -> toTemplateItem(
                                        savedTemplate.getId(),
                                        day.dayOffset(),
                                        mealSet,
                                        mealSet.items().get(index),
                                        index == 0))))
                .toList();
        templateItemRepository.saveAll(items);
        return items.size();
    }

    private MealPlanTemplateItem toTemplateItem(
            UUID templateId,
            int dayOffset,
            MealSetSeed mealSet,
            ItemSeed item,
            boolean firstItemInMeal) {
        return MealPlanTemplateItem.builder()
                .templateId(templateId)
                .dayOffset(dayOffset)
                .mealType(parseMealType(mealSet.mealType(), mealSet.key()).name())
                .foodCode(item.foodCode())
                .freeText(item.freeText())
                .portionGrams(item.portionGrams())
                .note(item.note() != null ? item.note() : (firstItemInMeal ? mealSet.note() : null))
                .build();
    }

    private MealType parseMealType(String value, String context) {
        try {
            return MealType.valueOf(value);
        } catch (RuntimeException exception) {
            throw new IllegalStateException("Invalid mealType in meal set: " + context, exception);
        }
    }

    private String normalizeCode(String code) {
        return code.trim().toLowerCase(Locale.ROOT);
    }

    public record SampleMealPlanDataset(
            int version,
            List<MealSetSeed> mealSets,
            List<TemplateSeed> templates) {
    }

    public record MealSetSeed(
            String key,
            String mealType,
            boolean cheatMeal,
            String note,
            List<ItemSeed> items) {
    }

    public record TemplateSeed(String name, String description, List<DaySeed> days) {
    }

    public record DaySeed(int dayOffset, List<String> meals) {
    }

    public record ItemSeed(
            String foodCode,
            String freeText,
            BigDecimal portionGrams,
            String note) {
    }
}
