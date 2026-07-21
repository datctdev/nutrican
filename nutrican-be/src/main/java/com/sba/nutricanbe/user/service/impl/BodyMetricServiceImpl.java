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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sba.nutricanbe.ai.service.OllamaService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.sba.nutricanbe.user.dto.InbodyAnalysisResponse;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BodyMetricServiceImpl implements BodyMetricService {

    private final BodyMetricRepository bodyMetricRepository;
    private final UserRepository userRepository;
    private final PtClientMappingRepository mappingRepository;
    private final ProgressTimelineService progressTimelineService;
    private final OllamaService ollamaService;
    private final ObjectMapper objectMapper;

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
        metric.setMuscleMass(request.getMuscleMass());
        metric.setLbm(request.getLbm());
        metric.setNote(request.getNote());
        BodyMetric saved = bodyMetricRepository.save(metric);
        progressTimelineService.evaluateAutoMilestones(userId);
        return saved;
    }

    @Override
    @Transactional
    public BodyMetricDto recordMetricDto(UUID userId, BodyMetricRequest request) {
        return BodyMetricDto.from(recordMetric(userId, request));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BodyMetricDto> listMetrics(UUID userId, Pageable pageable) {
        return bodyMetricRepository.findByUserIdOrderByRecordDateDesc(userId, pageable)
                .map(BodyMetricDto::from);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BodyMetricDto> listMetrics(UUID userId, int page, int size) {
        return listMetrics(userId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "recordDate")));
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
        if (user == null || !user.hasCustomerPrivileges()) {
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

    @Override
    public InbodyAnalysisResponse analyzeInbody(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Tập tin hình ảnh là bắt buộc");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (Exception e) {
            throw new BadRequestException("Không thể đọc tệp hình ảnh: " + e.getMessage());
        }
        String base64 = java.util.Base64.getEncoder().encodeToString(bytes);

        if (!ollamaService.isAvailable()) {
            throw new BadRequestException("Dịch vụ AI phân tích hình ảnh hiện không khả dụng. Vui lòng tự nhập số liệu.");
        }

        String prompt = """
                You are an expert medical OCR assistant. Analyze the InBody sheet carefully.
                Extract the following measurements:
                1. Weight (Cân nặng)
                2. SMM (Skeletal Muscle Mass / Khối lượng cơ xương)
                3. PBF (Percent Body Fat / Tỷ lệ phần trăm mỡ cơ thể)
                4. Fat Free Mass / FFM / LBM (Lean Body Mass / Fat Free Mass)
                5. The unit of measurement (either "kg" or "lb" as shown on the sheet, e.g. next to SMM or Weight)
                6. Height (Chiều cao - convert to centimeters integer, e.g. "5ft 2in" is 157 cm, "175cm" is 175)
                7. Age (Tuổi - integer)
                8. Gender (Giới tính - "male" or "female")

                Return ONLY a valid JSON object matching this schema, no markdown or extra text:
                {
                  "weight": 130.3,
                  "muscle_mass": 43.4,
                  "body_fat_percent": 36.7,
                  "lbm": 82.5,
                  "unit": "lb",
                  "height": 157,
                  "age": 35,
                  "gender": "female"
                }
                """;

        Map<String, Object> request = Map.of(
                "model", "qwen2.5vl:7b",
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", prompt,
                        "images", List.of(base64))),
                "stream", false,
                "format", "json");

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = ollamaService.post("/api/chat", request, Map.class);
            if (response == null) {
                throw new BadRequestException("Phản hồi từ AI rỗng");
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) response.get("message");
            if (message == null) {
                throw new BadRequestException("Không tìm thấy nội dung phản hồi từ AI");
            }
            String content = (String) message.get("content");
            if (content == null || content.isBlank()) {
                throw new BadRequestException("Nội dung phân tích trống");
            }

            int start = content.indexOf('{');
            int end = content.lastIndexOf('}');
            if (start == -1 || end == -1) {
                throw new BadRequestException("Kết quả trả về không phải là JSON hợp lệ: " + content);
            }
            String json = content.substring(start, end + 1);

            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {});

            BigDecimal rawWeight = getBigDecimal(parsed.get("weight"));
            BigDecimal rawMuscle = getBigDecimal(parsed.get("muscle_mass"));
            BigDecimal rawPbf = getBigDecimal(parsed.get("body_fat_percent"));
            BigDecimal rawLbm = getBigDecimal(parsed.get("lbm"));
            String unit = parsed.containsKey("unit") ? parsed.get("unit").toString().toLowerCase().trim() : "kg";

            Integer height = parsed.containsKey("height") ? getInteger(parsed.get("height")) : null;
            Integer age = parsed.containsKey("age") ? getInteger(parsed.get("age")) : null;
            String gender = parsed.containsKey("gender") ? parsed.get("gender").toString().toLowerCase().trim() : null;

            BigDecimal weight = rawWeight;
            BigDecimal muscle = rawMuscle;
            BigDecimal lbm = rawLbm;

            if ("lb".equals(unit) || "lbs".equals(unit)) {
                BigDecimal factor = new BigDecimal("0.45359237");
                if (weight != null) weight = weight.multiply(factor).setScale(2, java.math.RoundingMode.HALF_UP);
                if (muscle != null) muscle = muscle.multiply(factor).setScale(2, java.math.RoundingMode.HALF_UP);
                if (lbm != null) lbm = lbm.multiply(factor).setScale(2, java.math.RoundingMode.HALF_UP);
            }

            return InbodyAnalysisResponse.builder()
                    .weight(weight)
                    .bodyFatPercent(rawPbf)
                    .muscleMass(muscle)
                    .lbm(lbm)
                    .rawWeight(rawWeight)
                    .rawMuscleMass(rawMuscle)
                    .rawLbm(rawLbm)
                    .rawUnit(unit)
                    .height(height)
                    .age(age)
                    .gender(gender)
                    .build();

        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            throw new BadRequestException("Không thể phân tích ảnh InBody bằng AI (Phản hồi lỗi từ Ollama): " 
                    + e.getResponseBodyAsString() + " | " + e.getMessage());
        } catch (Exception e) {
            throw new BadRequestException("Không thể phân tích ảnh InBody bằng AI: " + e.getMessage());
        }
    }

    private BigDecimal getBigDecimal(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) {
            return BigDecimal.valueOf(((Number) obj).doubleValue());
        }
        try {
            return new BigDecimal(obj.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private Integer getInteger(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) {
            return ((Number) obj).intValue();
        }
        try {
            return Integer.parseInt(obj.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }
}
