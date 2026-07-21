package com.sba.nutricanbe.diet.controller;



import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;

import com.sba.nutricanbe.user.entity.User;

import com.sba.nutricanbe.diet.enums.MealComplexity;
import com.sba.nutricanbe.diet.enums.DietLogReviewStatus;

import com.sba.nutricanbe.diet.enums.MealPeriod;
import com.sba.nutricanbe.diet.enums.MealSource;

import com.sba.nutricanbe.common.util.MultipartUtils;

import com.sba.nutricanbe.diet.dto.request.*;
import com.sba.nutricanbe.diet.dto.response.*;
import com.sba.nutricanbe.diet.entity.DietLogFeedback;

import com.sba.nutricanbe.diet.service.DietLogImageService;

import com.sba.nutricanbe.diet.service.DietLogFeedbackService;
import com.sba.nutricanbe.diet.service.DietLogService;
import com.sba.nutricanbe.diet.service.MealAnalysisService;
import com.sba.nutricanbe.workspace.dto.DietLogReviewResponse;
import com.sba.nutricanbe.workspace.service.PtDietLogReviewService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.format.annotation.DateTimeFormat;

import org.springframework.http.MediaType;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;



import java.math.BigDecimal;

import java.time.LocalDate;

import java.util.Arrays;

import java.util.List;

import java.util.UUID;

import java.util.stream.Collectors;



@RestController

@RequestMapping("/api/v1/diet")

@RequiredArgsConstructor

public class DietLogController {



    private final DietLogService dietLogService;
    private final DietLogImageService dietLogImageService;
    private final MealAnalysisService mealAnalysisService;
    private final DietLogFeedbackService dietLogFeedbackService;
    private final PtDietLogReviewService ptDietLogReviewService;



    @PostMapping("/logs")

    public ResponseEntity<ApiResponse<DietLogResponse>> createLog(

            @AuthenticationPrincipal User user,

            @Valid @RequestBody CreateDietLogRequest request) {

        return ResponseEntity.ok(dietLogService.createLog(user.getId(), request));

    }



    @PostMapping(value = "/logs/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)

    public ResponseEntity<ApiResponse<AnalyzeMealResponse>> analyzeMeal(

            @AuthenticationPrincipal User user,

            @RequestParam(value = "file", required = false) MultipartFile file,

            @RequestParam(value = "image", required = false) MultipartFile image,

            @RequestParam(value = "files", required = false) MultipartFile[] files,

            @RequestParam(value = "meal_type", required = false) String mealType,

            @RequestParam(value = "meal_period", required = false) String mealPeriod,

            @RequestParam(value = "makeup_for_period", required = false) String makeupForPeriod,

            @RequestParam(value = "mealSource", required = false) String mealSource,

            @RequestParam(value = "mealComplexity", required = false) String mealComplexity,

            @RequestParam(value = "restaurantName", required = false) String restaurantName,

            @RequestParam(value = "hotpotBrothId", required = false) UUID hotpotBrothId,

            @RequestParam(value = "hotpotItemIds", required = false) UUID[] hotpotItemIds,

            @RequestParam(value = "hotpotPortions", required = false) String hotpotPortions,

            @RequestParam(value = "compositeItemIds", required = false) UUID[] compositeItemIds,

            @RequestParam(value = "compositePortions", required = false) String compositePortions,

            @RequestParam(value = "log_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate logDate) {

        MultipartFile upload = MultipartUtils.requireSingleFile(file, image, files);

        AnalyzeMealContext context = AnalyzeMealContext.builder()

                .mealType(mealType)

                .mealPeriod(parseMealPeriod(mealPeriod))

                .makeupForPeriod(parseMealPeriod(makeupForPeriod))

                .logDate(logDate)

                .mealSource(parseMealSource(mealSource))

                .mealComplexity(parseMealComplexity(mealComplexity))

                .restaurantName(restaurantName)

                .hotpotBrothId(hotpotBrothId)

                .hotpotItemIds(hotpotItemIds != null ? Arrays.asList(hotpotItemIds) : null)

                .hotpotPortions(parsePortions(hotpotPortions))

                .compositeItemIds(compositeItemIds != null ? Arrays.asList(compositeItemIds) : null)

                .compositePortions(parsePortions(compositePortions))

                .build();

        return ResponseEntity.ok(mealAnalysisService.analyzeMeal(user.getId(), upload, context));

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

    @GetMapping("/logs/client/{clientId}")
    @PreAuthorize("hasAnyRole('PT_CERTIFIED', 'PT_FREELANCE')")
    public ResponseEntity<ApiResponse<PageResponse<DietLogReviewResponse>>> getClientLogsForPt(
            @PathVariable UUID clientId,
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "APPROVED") DietLogReviewStatus reviewStatus) {
        return ResponseEntity.ok(ptDietLogReviewService.getClientDietLogs(
                user.getId(), clientId, page, size, reviewStatus));
    }



    @GetMapping("/logs/{id}")

    public ResponseEntity<ApiResponse<DietLogResponse>> getLogById(

            @PathVariable UUID id,

            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(dietLogService.getLogById(id, user.getId()));

    }



    @PutMapping("/logs/{id}")

    public ResponseEntity<ApiResponse<DietLogResponse>> updateLog(

            @PathVariable UUID id,

            @AuthenticationPrincipal User user,

            @Valid @RequestBody CreateDietLogRequest request) {

        return ResponseEntity.ok(dietLogService.updateLog(id, user.getId(), request));

    }



    @PutMapping("/logs/{id}/submit-for-review")

    public ResponseEntity<ApiResponse<DietLogResponse>> submitForReview(

            @PathVariable UUID id,

            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(dietLogService.submitForReview(id, user.getId()));

    }

    @PutMapping("/logs/{id}/review-request")
    public ResponseEntity<ApiResponse<DietLogResponse>> reviewRequest(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dietLogService.submitForReview(id, user.getId()));
    }

    @PutMapping("/logs/{id}/feedback")
    public ResponseEntity<ApiResponse<DietLogFeedback>> saveFeedback(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            @RequestBody DietLogFeedbackRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                dietLogFeedbackService.saveFeedback(user.getId(), id, request), "Feedback saved"));
    }



    @PutMapping("/logs/{id}/confirm-recognition")

    public ResponseEntity<ApiResponse<DietLogResponse>> confirmRecognition(

            @PathVariable UUID id,

            @AuthenticationPrincipal User user,

            @Valid @RequestBody ConfirmRecognitionRequest request) {

        return ResponseEntity.ok(mealAnalysisService.confirmRecognition(id, user.getId(), request));

    }



    @DeleteMapping("/logs/{id}")

    public ResponseEntity<ApiResponse<Void>> deleteLog(

            @PathVariable UUID id,

            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(dietLogService.deleteLog(id, user.getId()));

    }



    @PostMapping(value = "/logs/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)

    public ResponseEntity<ApiResponse<List<DietLogImageDto>>> uploadImages(

            @PathVariable UUID id,

            @AuthenticationPrincipal User user,

            @RequestParam("files") MultipartFile[] files) {

        return ResponseEntity.ok(dietLogImageService.uploadImages(id, files, user.getId()));

    }



    @GetMapping("/logs/{id}/images")

    public ResponseEntity<ApiResponse<List<DietLogImageDto>>> getImages(

            @PathVariable UUID id,

            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(dietLogImageService.getImages(id, user.getId()));

    }



    @PutMapping("/logs/{id}/images/{imageId}/primary")

    public ResponseEntity<ApiResponse<DietLogImageDto>> setPrimaryImage(

            @PathVariable UUID id,

            @PathVariable UUID imageId,

            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(dietLogImageService.setPrimaryImage(id, imageId, user.getId()));

    }



    @DeleteMapping("/logs/{id}/images/{imageId}")

    public ResponseEntity<ApiResponse<Void>> deleteImage(

            @PathVariable UUID id,

            @PathVariable UUID imageId,

            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(dietLogImageService.deleteImage(id, imageId, user.getId()));

    }

    @DeleteMapping("/logs/{id}/images/primary")
    public ResponseEntity<ApiResponse<Void>> deletePrimaryImage(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(dietLogImageService.deletePrimaryImage(id, user.getId()));
    }



    @GetMapping("/summary")

    public ResponseEntity<ApiResponse<DietSummaryResponse>> getSummary(

            @AuthenticationPrincipal User user,

            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return ResponseEntity.ok(dietLogService.getSummary(user.getId(), date));

    }



    private MealPeriod parseMealPeriod(String value) {

        if (value == null || value.isBlank()) return null;

        try {

            return MealPeriod.valueOf(value.trim().toUpperCase());

        } catch (Exception e) {

            return null;

        }

    }



    private MealSource parseMealSource(String value) {

        if (value == null || value.isBlank()) return MealSource.HOME_COOKED;

        try {

            return MealSource.valueOf(value);

        } catch (Exception e) {

            return MealSource.HOME_COOKED;

        }

    }



    private MealComplexity parseMealComplexity(String value) {

        if (value == null || value.isBlank()) return MealComplexity.SIMPLE;

        try {

            return MealComplexity.valueOf(value);

        } catch (Exception e) {

            return MealComplexity.SIMPLE;

        }

    }



    private List<BigDecimal> parsePortions(String portions) {

        if (portions == null || portions.isBlank()) return null;

        return Arrays.stream(portions.split(","))

                .map(String::trim)

                .filter(s -> !s.isEmpty())

                .map(BigDecimal::new)

                .collect(Collectors.toList());

    }

}


