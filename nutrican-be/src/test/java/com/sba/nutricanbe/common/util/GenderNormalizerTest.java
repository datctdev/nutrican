package com.sba.nutricanbe.common.util;

import com.sba.nutricanbe.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GenderNormalizerTest {

    @Test
    void normalize_acceptsMixedCaseAndAliases() {
        assertEquals("male", GenderNormalizer.normalize("MALE"));
        assertEquals("male", GenderNormalizer.normalize("Male"));
        assertEquals("male", GenderNormalizer.normalize("m"));
        assertEquals("female", GenderNormalizer.normalize("FEMALE"));
        assertEquals("female", GenderNormalizer.normalize("female"));
        assertEquals("female", GenderNormalizer.normalize("F"));
    }

    @Test
    void normalize_blankOrUnknown_isNull() {
        assertNull(GenderNormalizer.normalize(null));
        assertNull(GenderNormalizer.normalize("  "));
        assertNull(GenderNormalizer.normalize("other"));
    }

    @Test
    void requireCanonical_rejectsUnknown() {
        assertThrows(BadRequestException.class, () -> GenderNormalizer.requireCanonical("X"));
        assertEquals("female", GenderNormalizer.requireCanonical("FEMALE"));
    }
}
