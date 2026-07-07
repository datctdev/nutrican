package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.entity.FoodItem;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.DietPreference;
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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DietPrefCheckServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private FoodItemRepository foodItemRepository;

    @InjectMocks
    private DietPrefCheckServiceImpl service;

    @Test
    void vegetarianMismatchForNonVegetarianTags() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().dietPreference(DietPreference.VEGETARIAN).build();
        ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        FoodItem beef = FoodItem.builder().dietTags(List.of("KETO")).aliases(List.of("beef")).build();
        when(foodItemRepository.findAll()).thenReturn(List.of(beef));

        assertTrue(service.hasMismatch(userId, "beef"));
    }

    @Test
    void veganMatchesVeganTag() {
        assertTrue(service.matchesPreference(DietPreference.VEGAN, List.of("VEGAN")));
        assertTrue(service.matchesPreference(DietPreference.VEGETARIAN, List.of("VEGAN")));
        assertFalse(service.matchesPreference(DietPreference.VEGETARIAN, List.of("KETO")));
    }
}
