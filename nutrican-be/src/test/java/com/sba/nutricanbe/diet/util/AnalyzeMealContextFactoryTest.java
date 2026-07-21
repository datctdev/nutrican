package com.sba.nutricanbe.diet.util;

import com.sba.nutricanbe.diet.dto.request.AnalyzeMealContext;
import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealSource;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AnalyzeMealContextFactoryTest {

    @Test
    void fromMultipart_parsesEnumsAndPortions() {
        UUID broth = UUID.randomUUID();
        UUID item = UUID.randomUUID();
        AnalyzeMealContext ctx = AnalyzeMealContextFactory.fromMultipart(
                "LUNCH",
                "noon",
                "MORNING",
                LocalDate.of(2026, 7, 21),
                "HOME_COOKED",
                "SIMPLE",
                "Quán A",
                broth,
                new UUID[]{item},
                "100, 200",
                null,
                null);

        assertEquals("LUNCH", ctx.getMealType());
        assertEquals(MealPeriod.NOON, ctx.getMealPeriod());
        assertEquals(MealPeriod.MORNING, ctx.getMakeupForPeriod());
        assertEquals(MealSource.HOME_COOKED, ctx.getMealSource());
        assertEquals(MealComplexity.SIMPLE, ctx.getMealComplexity());
        assertEquals(List.of(new BigDecimal("100"), new BigDecimal("200")), ctx.getHotpotPortions());
        assertEquals(List.of(item), ctx.getHotpotItemIds());
    }

    @Test
    void parseDefaults_whenBlankOrInvalid() {
        assertNull(AnalyzeMealContextFactory.parseMealPeriod(null));
        assertEquals(MealSource.HOME_COOKED, AnalyzeMealContextFactory.parseMealSource(""));
        assertEquals(MealSource.HOME_COOKED, AnalyzeMealContextFactory.parseMealSource("NOPE"));
        assertEquals(MealComplexity.SIMPLE, AnalyzeMealContextFactory.parseMealComplexity(null));
        assertNull(AnalyzeMealContextFactory.parsePortions("  "));
    }
}
