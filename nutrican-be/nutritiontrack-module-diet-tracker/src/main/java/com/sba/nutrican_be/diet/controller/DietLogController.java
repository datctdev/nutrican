package com.sba.nutrican_be.diet.controller;

import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.dto.PageResponse;
import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.diet.dto.*;
import com.sba.nutrican_be.diet.service.DietLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/diet")
@RequiredArgsConstructor
public class DietLogController {

    private final DietLogService dietLogService;

    @PostMapping("/logs")
    public ResponseEntity<ApiResponse<DietLogResponse>> createLog(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateDietLogRequest request) {
        return ResponseEntity.ok(dietLogService.createLog(user.getId(), request));
    }

    @PostMapping(value = "/logs/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AnalyzeMealResponse>> analyzeMeal(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "meal_type", required = false) String mealType) {
        return ResponseEntity.ok(dietLogService.analyzeMeal(user.getId(), file, mealType));
    }

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<PageResponse<DietLogResponse>>> getLogs(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(dietLogService.getLogs(user.getId(), page, size, startDate, endDate, status));
    }

    @GetMapping("/logs/{id}")
    public ResponseEntity<ApiResponse<DietLogResponse>> getLogById(@PathVariable Long id) {
        return ResponseEntity.ok(dietLogService.getLogById(id));
    }

    @PutMapping("/logs/{id}")
    public ResponseEntity<ApiResponse<DietLogResponse>> updateLog(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateDietLogRequest request) {
        return ResponseEntity.ok(dietLogService.updateLog(id, user.getId(), request));
    }

    @DeleteMapping("/logs/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteLog(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dietLogService.deleteLog(id, user.getId()));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DietSummaryResponse>> getSummary(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(dietLogService.getSummary(user.getId(), date));
    }

    @PostMapping("/sos")
    public ResponseEntity<ApiResponse<Void>> createSos(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateSosRequest request) {
        return ResponseEntity.ok(dietLogService.createSosTicket(user.getId(), request));
    }

    @GetMapping("/sos")
    public ResponseEntity<ApiResponse<Void>> getSosTickets(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(null, "SOS tickets retrieved"));
    }
}
