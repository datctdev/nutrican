package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.user.dto.BodyMetricRequest;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.ProgressTimelineService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BodyMetricServiceTest {

    @Mock private BodyMetricRepository bodyMetricRepository;
    @Mock private UserRepository userRepository;
    @Mock private PtClientMappingRepository mappingRepository;
    @Mock private ProgressTimelineService progressTimelineService;

    @InjectMocks
    private BodyMetricServiceImpl service;

    @Test
    void rejectsFutureRecordDate() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().build()));

        BodyMetricRequest req = new BodyMetricRequest();
        req.setRecordDate(LocalDate.now().plusDays(1));
        req.setWeight(BigDecimal.valueOf(65));

        assertThrows(BadRequestException.class, () -> service.recordMetric(userId, req));
    }

    @Test
    void upsertsSameDayRecord() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().build();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        LocalDate today = LocalDate.now();
        BodyMetric existing = BodyMetric.builder().user(user).recordDate(today).weight(BigDecimal.valueOf(70)).build();
        when(bodyMetricRepository.findByUser_IdAndRecordDate(userId, today)).thenReturn(Optional.of(existing));
        when(bodyMetricRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BodyMetricRequest req = new BodyMetricRequest();
        req.setRecordDate(today);
        req.setWeight(BigDecimal.valueOf(68));
        BodyMetric saved = service.recordMetric(userId, req);

        assertEquals(BigDecimal.valueOf(68), saved.getWeight());
        verify(bodyMetricRepository).save(existing);
    }

    @Test
    void ptListRequiresActiveMapping() {
        UUID ptId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        when(mappingRepository.existsByPt_IdAndClient_IdAndStatus(ptId, clientId,
                com.sba.nutricanbe.user.enums.ClientMappingStatus.ACTIVE)).thenReturn(false);

        assertThrows(UnauthorizedException.class,
                () -> service.listMetricsForClient(ptId, clientId, org.springframework.data.domain.PageRequest.of(0, 10)));
    }

    @Test
    void shouldRemind_falseWhenOptedOut() {
        User user = User.builder().role(UserRole.CUSTOMER).build();
        UUID userId = UUID.randomUUID();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", userId);
        Map<String, Boolean> optIn = new HashMap<>();
        optIn.put("bodyMetricReminder", false);
        user.setNotificationOptIn(optIn);

        assertFalse(service.shouldRemind(user));
    }

    @Test
    void shouldRemind_trueWhenNoRecentMetric() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().role(UserRole.CUSTOMER).build();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", userId);
        when(bodyMetricRepository.findTopByUserIdOrderByRecordDateDesc(userId)).thenReturn(Optional.empty());

        assertTrue(service.shouldRemind(user));
    }

    @Test
    void getReminderStatus_showsWhenOverdue() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().role(UserRole.CUSTOMER).build();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        BodyMetric old = BodyMetric.builder()
                .recordDate(LocalDate.now().minusDays(10))
                .weight(BigDecimal.valueOf(70))
                .build();
        when(bodyMetricRepository.findTopByUserIdOrderByRecordDateDesc(userId)).thenReturn(Optional.of(old));

        var status = service.getReminderStatus(userId);
        assertTrue(status.isShowReminder());
        assertEquals(10, status.getDaysSinceLastLog());
    }
}
