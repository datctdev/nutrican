package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.BodyMetricRequest;
import com.sba.nutricanbe.user.dto.BodyMetricDto;
import com.sba.nutricanbe.user.dto.BodyMetricReminderStatusDto;
import com.sba.nutricanbe.user.entity.BodyMetric;
import com.sba.nutricanbe.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import com.sba.nutricanbe.user.dto.InbodyAnalysisResponse;

import java.util.UUID;

public interface BodyMetricService {
    BodyMetric recordMetric(UUID userId, BodyMetricRequest request);

    InbodyAnalysisResponse analyzeInbody(MultipartFile file);

    Page<BodyMetricDto> listMetrics(UUID userId, Pageable pageable);

    Page<BodyMetricDto> listMetricsForClient(UUID ptId, UUID clientId, Pageable pageable);

    BodyMetricReminderStatusDto getReminderStatus(UUID userId);

    boolean shouldRemind(User user);
}