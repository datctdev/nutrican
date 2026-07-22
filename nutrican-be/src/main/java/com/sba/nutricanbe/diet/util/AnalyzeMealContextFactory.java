package com.sba.nutricanbe.diet.util;

import com.sba.nutricanbe.diet.dto.request.AnalyzeMealContext;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;


public final class AnalyzeMealContextFactory {

    private AnalyzeMealContextFactory() {
    }

    public static AnalyzeMealContext fromMultipart(
            String mealType,
            String mealPeriod,
            String makeupForPeriod,
            LocalDate logDate,
            String mealSource,
            String mealComplexity,
            String restaurantName,
            UUID hotpotBrothId,
            UUID[] hotpotItemIds,
            String hotpotPortions,
            UUID[] compositeItemIds,
            String compositePortions) {
        return AnalyzeMealContext.builder()
                .mealType(mealType)
                .mealPeriod(parseMealPeriod(mealPeriod))
                .makeupForPeriod(parseMealPeriod(makeupForPeriod))
                .logDate(logDate)
                .mealSource(parseMealSource(mealSource))
                .mealComplexity(parseMealComplexity(mealComplexity))
                .restaurantName(restaurantName)
                .hotpotBrothId(hotpotBrothId)
                .hotpotItemIds(hotpotItemIds != null ? Arrays.asList(hotpotItemIds) : null)
                .hotpotPortions(parsePortions(hotpotPortions))
                .compositeItemIds(compositeItemIds != null ? Arrays.asList(compositeItemIds) : null)
                .compositePortions(parsePortions(compositePortions))
                .build();
    }

    static MealPeriod parseMealPeriod(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return MealPeriod.valueOf(value.trim().toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }

    static MealSource parseMealSource(String value) {
        if (value == null || value.isBlank()) {
            return MealSource.HOME_COOKED;
        }
        try {
            return MealSource.valueOf(value);
        } catch (Exception e) {
            return MealSource.HOME_COOKED;
        }
    }

    static MealComplexity parseMealComplexity(String value) {
        if (value == null || value.isBlank()) {
            return MealComplexity.SIMPLE;
        }
        try {
            return MealComplexity.valueOf(value);
        } catch (Exception e) {
            return MealComplexity.SIMPLE;
        }
    }

    static List<BigDecimal> parsePortions(String portions) {
        if (portions == null || portions.isBlank()) {
            return null;
        }
        return Arrays.stream(portions.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(BigDecimal::new)
                .collect(Collectors.toList());
    }
}
