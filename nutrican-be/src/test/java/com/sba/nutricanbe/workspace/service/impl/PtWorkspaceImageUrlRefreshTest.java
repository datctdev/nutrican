package com.sba.nutricanbe.workspace.service.impl;

import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.entity.DietLogImage;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.service.UserQueryService;
import com.sba.nutricanbe.workspace.dto.DietLogReviewResponse;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PtWorkspaceImageUrlRefreshTest {

    @Mock private UserQueryService userQueryService;
    @Mock private StorageService storageService;

    @InjectMocks
    private PtDietLogReviewServiceImpl ptWorkspaceService;

    @Test
    void reviewResponseRegeneratesMainAndAdditionalImageUrlsFromDurableObjectNames() {
        UUID customerId = UUID.randomUUID();
        DietLogImage additionalImage = DietLogImage.builder()
                .imageUrl("https://minio/expired-additional")
                .imageObjectName("diet-logs/customer/additional.jpg")
                .isPrimary(false)
                .sortOrder(1)
                .build();
        DietLog dietLog = DietLog.builder()
                .customerId(customerId)
                .imageUrl("https://minio/expired-main")
                .imageObjectName("diet-logs/customer/main.jpg")
                .additionalImages(List.of(additionalImage))
                .build();

        when(userQueryService.findUserById(customerId)).thenReturn(Optional.empty());
        when(storageService.getPresignedUrl("diet-logs/customer/main.jpg"))
                .thenReturn("https://minio/fresh-main");
        when(storageService.getPresignedUrl("diet-logs/customer/additional.jpg"))
                .thenReturn("https://minio/fresh-additional");

        DietLogReviewResponse response = ReflectionTestUtils.invokeMethod(
                ptWorkspaceService,
                "toReviewResponse",
                dietLog);

        assertEquals("https://minio/fresh-main", response.getImageUrl());
        assertEquals("https://minio/fresh-additional", response.getAdditionalImages().get(0).getImageUrl());
        verify(storageService).getPresignedUrl("diet-logs/customer/main.jpg");
        verify(storageService).getPresignedUrl("diet-logs/customer/additional.jpg");
    }
}
