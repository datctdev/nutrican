package com.sba.nutrican_be.admin.controller;

import com.sba.nutrican_be.admin.dto.RblExportRowDto;
import com.sba.nutrican_be.admin.dto.RblStatsResponse;
import com.sba.nutrican_be.admin.service.RblAdminService;
import com.sba.nutrican_be.core.dto.ApiResponse;
import com.sba.nutrican_be.core.enums.MealSource;
import com.sba.nutrican_be.core.enums.RecognitionSource;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/rbl")
@RequiredArgsConstructor
public class RblAdminController {

    private final RblAdminService rblAdminService;

    @GetMapping("/logs/{logId}")
    public ResponseEntity<ApiResponse<RblExportRowDto>> getLogSnapshot(@PathVariable UUID logId) {
        return ResponseEntity.ok(rblAdminService.getLogSnapshot(logId));
    }

    @GetMapping("/export/preview")
    public ResponseEntity<ApiResponse<List<RblExportRowDto>>> exportPreview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "true") boolean cvOnly,
            @RequestParam(defaultValue = "false") boolean includeRejected) {
        return ResponseEntity.ok(rblAdminService.exportPreview(from, to, cvOnly, includeRejected));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) MealSource mealSource,
            @RequestParam(required = false) RecognitionSource recognitionSource,
            @RequestParam(defaultValue = "true") boolean cvOnly,
            @RequestParam(defaultValue = "false") boolean includeRejected) {
        ApiResponse<byte[]> result = rblAdminService.exportCsv(from, to, mealSource, recognitionSource, cvOnly, includeRejected);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=rbl_export.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(result.getData());
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<RblStatsResponse>> getStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(rblAdminService.getStats(from, to));
    }

    @GetMapping(value = "/report", produces = MediaType.TEXT_MARKDOWN_VALUE)
    public ResponseEntity<String> generateReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        ApiResponse<String> result = rblAdminService.generateReport(from, to);
        return ResponseEntity.ok(result.getData());
    }
}
