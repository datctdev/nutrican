package com.sba.nutricanbe.common.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RblAdminStatsUtilTest {

    @Test
    void extractDietPrefFromKey_returnsSuffix() throws Exception {
        var method = com.sba.nutricanbe.admin.service.impl.RblAdminServiceImpl.class
                .getDeclaredMethod("extractDietPrefFromKey", String.class);
        method.setAccessible(true);
        Object result = method.invoke(null, "HOME_COOKED_SIMPLE_AI_ONLY_VEGETARIAN");
        assertEquals("VEGETARIAN", result);
    }

    @Test
    void extractDietPrefFromKey_nullReturnsNull() throws Exception {
        var method = com.sba.nutricanbe.admin.service.impl.RblAdminServiceImpl.class
                .getDeclaredMethod("extractDietPrefFromKey", String.class);
        method.setAccessible(true);
        Object result = method.invoke(null, (Object) null);
        assertEquals(null, result);
    }
}
