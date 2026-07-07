package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.common.exception.UnauthorizedException;
import com.sba.nutricanbe.user.dto.BodyMetricDto;
import com.sba.nutricanbe.user.dto.BodyMetricReminderStatusDto;
import com.sba.nutricanbe.user.dto.BodyMetricRequest;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.BodyMetricRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.service.BodyMetricService;
import com.sba.nutricanbe.user.service.ProgressTimelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BodyMetricServiceImpl implements BodyMetricService {

    private final BodyMetricRepository bodyMetricRepository;
    private final UserRepository userRepository;
    private final PtClientMappingRepository mappingRepository;
    private final ProgressTimelineService progressTimelineService;

    @Override
    @Transactional
    public BodyMetric recordMetric(UUID userId, BodyMetricRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        LocalDate date = request.getRecordDate() != null ? request.getRecordDate() : LocalDate.now();
        if (date.isAfter(LocalDate.now())) {
            throw new BadRequestException("recordDate must not be in the future");
        }
        BodyMetric metric = bodyMetricRepository.findByUser_IdAndRecordDate(userId, date)
                .orElse(BodyMetric.builder().user(user).recordDate(date).build());
        metric.setWeight(request.getWeight());
        metric.setBodyFatPercent(request.getBodyFatPercent());
        metric.setNote(request.getNote());
        BodyMetric saved = bodyMetricRepository.save(metric);
        progressTimelineService.evaluateAutoMilestones(userId);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BodyMetricDto> listMetrics(UUID userId, Pageable pageable) {
        return bodyMetricRepository.findByUserIdOrderByRecordDateDesc(userId, pageable)
                .map(BodyMetricDto::from);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BodyMetricDto> listMetricsForClient(UUID ptId, UUID clientId, Pageable pageable) {
        boolean allowed = mappingRepository.existsByPt_IdAndClient_IdAndStatus(
                ptId, clientId, ClientMappingStatus.ACTIVE);
        if (!allowed) {
            throw new UnauthorizedException("No active mapping with this client");
        }
        return bodyMetricRepository.findByUserIdOrderByRecordDateDesc(clientId, pageable)
                .map(BodyMetricDto::from);
    }

    @Override
    @Transactional(readOnly = true)
    public BodyMetricReminderStatusDto getReminderStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (!shouldRemind(user)) {
            return BodyMetricReminderStatusDto.builder().showReminder(false).build();
        }
        int days = daysSinceLastLog(userId);
        return BodyMetricReminderStatusDto.builder()
                .showReminder(true)
                .daysSinceLastLog(days)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean shouldRemind(User user) {
        if (user == null || user.getRole() != com.sba.nutricanbe.common.enums.UserRole.CUSTOMER) {
            return false;
        }
        Map<String, Boolean> optIn = user.getNotificationOptIn();
        if (optIn != null && Boolean.FALSE.equals(optIn.get("bodyMetricReminder"))) {
            return false;
        }
        return daysSinceLastLog(user.getId()) >= 7;
    }

    private int daysSinceLastLog(UUID userId) {
        return bodyMetricRepository.findTopByUserIdOrderByRecordDateDesc(userId)
                .map(m -> (int) ChronoUnit.DAYS.between(m.getRecordDate(), LocalDate.now()))
                .orElse(Integer.MAX_VALUE);
    }
}
