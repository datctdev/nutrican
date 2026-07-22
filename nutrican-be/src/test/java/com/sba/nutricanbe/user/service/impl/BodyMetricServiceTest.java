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
import com.sba.nutricanbe.ai.service.OllamaService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;

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
    @Mock private OllamaService ollamaService;
    @Mock private ObjectMapper objectMapper;

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

    @Test
    void analyzeInbody_throwsWhenFileEmpty() {
        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.isEmpty()).thenReturn(true);
        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.analyzeInbody(mockFile));
        assertTrue(ex.getMessage().contains("bắt buộc"));
    }

    @Test
    void analyzeInbody_throwsWhenContentTypeInvalid() {
        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.isEmpty()).thenReturn(false);
        when(mockFile.getSize()).thenReturn(1024L);
        when(mockFile.getContentType()).thenReturn("application/pdf");
        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.analyzeInbody(mockFile));
        assertTrue(ex.getMessage().contains("JPG"));
    }

    @Test
    void analyzeInbody_throwsWhenFileTooLarge() {
        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.isEmpty()).thenReturn(false);
        when(mockFile.getSize()).thenReturn(11L * 1024 * 1024);
        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.analyzeInbody(mockFile));
        assertTrue(ex.getMessage().contains("10MB"));
    }

    @Test
    void analyzeInbody_throwsWhenMagicBytesInvalid() throws Exception {
        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        when(mockFile.isEmpty()).thenReturn(false);
        when(mockFile.getSize()).thenReturn(20L);
        when(mockFile.getContentType()).thenReturn("image/jpeg");
        when(mockFile.getBytes()).thenReturn(new byte[]{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12});
        BadRequestException ex = assertThrows(BadRequestException.class, () -> service.analyzeInbody(mockFile));
        assertTrue(ex.getMessage().toLowerCase().contains("ảnh") || ex.getMessage().toLowerCase().contains("hợp lệ"));
    }

    @Disabled
    @Test
    void testRealOllamaCall() throws Exception {
        com.sba.nutricanbe.ai.service.impl.OllamaServiceImpl realService = 
            new com.sba.nutricanbe.ai.service.impl.OllamaServiceImpl("http://localhost:11434", "qwen2.5vl:7b");
        
        java.io.File file = new java.io.File("C:/Users/anh01/.gemini/antigravity-ide/brain/8b1d1d4c-0d04-470d-a387-9aae7e8d4827/media__1784053780915.png");
        byte[] bytes = java.nio.file.Files.readAllBytes(file.toPath());
        String base64 = java.util.Base64.getEncoder().encodeToString(bytes);

        String prompt = """
                You are an expert medical OCR assistant. Analyze the InBody sheet carefully.
                Extract the following measurements:
                1. Weight (Cân nặng)
                2. SMM (Skeletal Muscle Mass / Khối lượng cơ xương)
                3. PBF (Percent Body Fat / Tỷ lệ phần trăm mỡ cơ thể)
                4. Fat Free Mass / FFM / LBM (Lean Body Mass / Fat Free Mass)
                5. The unit of measurement (either "kg" or "lb" as shown on the sheet, e.g. next to SMM or Weight)

                Return ONLY a valid JSON object matching this schema, no markdown or extra text:
                {
                  "weight": 130.3,
                  "muscle_mass": 43.4,
                  "body_fat_percent": 36.7,
                  "lbm": 82.5,
                  "unit": "lb"
                }
                """;
        Map<String, Object> body = Map.of(
                "model", "qwen2.5vl:7b",
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", prompt,
                        "images", List.of(base64))),
                "stream", false,
                "format", "json");

        try {
            System.out.println("Calling real Ollama from test...");
            Map response = realService.post("/api/chat", body, Map.class);
            System.out.println("Ollama response: " + response);
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
}
