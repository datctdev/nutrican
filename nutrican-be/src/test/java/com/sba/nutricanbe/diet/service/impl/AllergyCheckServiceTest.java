package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.dto.PlanAllergyWarning;
import com.sba.nutricanbe.diet.entity.FoodAllergenMapping;
import com.sba.nutricanbe.diet.enums.AllergenType;
import com.sba.nutricanbe.diet.repository.FoodAllergenMappingRepository;
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
    @Mock
    private FoodAllergenMappingRepository allergenMappingRepository;

    @InjectMocks
    private AllergyCheckServiceImpl allergyCheckService;

    @Test
    void checkFoodCode_returnsMatchingAllergens() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().allergens(List.of(AllergenType.SEAFOOD)).build();
        ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(allergenMappingRepository.findByFoodCode("ca_kho_to"))
                .thenReturn(Optional.of(FoodAllergenMapping.builder()
                        .foodCode("ca_kho_to")
                        .allergens(List.of(AllergenType.SEAFOOD))
                        .build()));

        List<AllergenType> matches = allergyCheckService.checkFoodCode(userId, "ca_kho_to");

        assertEquals(1, matches.size());
        assertEquals(AllergenType.SEAFOOD, matches.get(0));
    }

    @Test
    void checkPlan_warnsPerItemIndex() {
        UUID clientId = UUID.randomUUID();
        User user = User.builder().allergens(List.of(AllergenType.SEAFOOD)).build();
        ReflectionTestUtils.setField(user, "id", clientId);
        when(userRepository.findById(clientId)).thenReturn(Optional.of(user));
        when(allergenMappingRepository.findByFoodCode("ca_kho_to"))
                .thenReturn(Optional.of(FoodAllergenMapping.builder()
                        .foodCode("ca_kho_to")
                        .allergens(List.of(AllergenType.SEAFOOD))
                        .build()));
        when(allergenMappingRepository.findByFoodCode("banh_mi")).thenReturn(Optional.empty());

        List<PlanAllergyWarning> warnings = allergyCheckService.checkPlan(
                clientId, List.of("banh_mi", "ca_kho_to"));

        assertEquals(1, warnings.size());
        assertEquals(1, warnings.get(0).getItemIndex());
        assertEquals("ca_kho_to", warnings.get(0).getFoodCode());
        assertTrue(warnings.get(0).getMatchedAllergens().contains(AllergenType.SEAFOOD));
    }
}
