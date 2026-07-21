package com.sba.nutricanbe.diet.service.impl;

import com.sba.nutricanbe.diet.dto.request.DietLogItemRequest;
import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogItem;
import com.sba.nutricanbe.diet.enums.DietLogItemSource;
import com.sba.nutricanbe.diet.repository.FoodItemRepository;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DietLogHelperCustomItemTest {

    @Mock private FoodItemRepository foodItemRepository;
    @Mock private PtClientMappingRepository ptClientMappingRepository;
    @Mock private FoodCatalogService foodCatalogService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private UserQueryService userQueryService;
    @Mock private StorageService storageService;

    @InjectMocks
    private DietLogHelperImpl dietLogHelper;

    @Test
    void customItem_neverPersistsFoodItemIdOrCatalogWrite() {
        UUID fakeId = UUID.randomUUID();
        when(foodItemRepository.findById(fakeId)).thenReturn(Optional.empty());

        DietLogItemRequest req = new DietLogItemRequest();
        req.setFoodItemId(fakeId);
        req.setItemName("  bạch tuộc  ");
        req.setQuantityG(BigDecimal.valueOf(100));
        req.setCalories(BigDecimal.valueOf(312));
        req.setProtein(BigDecimal.valueOf(25));
        req.setCarb(BigDecimal.ZERO);
        req.setFat(BigDecimal.valueOf(2));

        DietLogItem item = dietLogHelper.buildLogItem(DietLog.builder().build(), req);

        assertNull(item.getFoodItemId(), "custom line must not keep bogus foodItemId");
        assertEquals("bạch tuộc", item.getItemName());
        assertEquals(DietLogItemSource.USER_SELECTED, item.getSource());
        assertEquals(0, BigDecimal.valueOf(25).compareTo(item.getProtein()));
        verify(foodItemRepository, never()).save(any());
        verify(foodItemRepository, never()).saveAndFlush(any());
    }
}
