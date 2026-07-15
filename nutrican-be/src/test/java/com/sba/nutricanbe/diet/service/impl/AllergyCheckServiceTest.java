package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.dto.PlanAllergyWarning;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AllergyCheckServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AllergyCheckServiceImpl allergyCheckService;

    @Test
    void checkFoodCode_returnsMatchingAllergens() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().allergicFoodCodes(List.of("ca_kho_to")).build();
        ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        List<String> matches = allergyCheckService.checkFoodCode(userId, "ca_kho_to");

        assertEquals(1, matches.size());
        assertEquals("ca_kho_to", matches.get(0));
    }

    @Test
    void checkPlan_warnsPerItemIndex() {
        UUID clientId = UUID.randomUUID();
        User user = User.builder().allergicFoodCodes(List.of("ca_kho_to")).build();
        ReflectionTestUtils.setField(user, "id", clientId);
        when(userRepository.findById(clientId)).thenReturn(Optional.of(user));

        List<PlanAllergyWarning> warnings = allergyCheckService.checkPlan(
                clientId, List.of("banh_mi", "ca_kho_to"));

        assertEquals(1, warnings.size());
        assertEquals(1, warnings.get(0).getItemIndex());
        assertEquals("ca_kho_to", warnings.get(0).getFoodCode());
        assertTrue(warnings.get(0).getMatchedFoodCodes().contains("ca_kho_to"));
    }
}

