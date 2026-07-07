package com.sba.nutricanbe.diet.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.FoodItemResponse;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import com.sba.nutricanbe.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/foods")
@RequiredArgsConstructor
public class FoodCatalogController {

    private final FoodCatalogService foodCatalogService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<FoodItemResponse>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false, defaultValue = "true") boolean dietFilter,
            @AuthenticationPrincipal User user) {
        UUID userId = user != null ? user.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(foodCatalogService.search(q, category, dietFilter, userId)));
    }

    @GetMapping("/resnet-dishes")
    public ResponseEntity<ApiResponse<List<FoodItemResponse>>> getResNetDishes() {
        return ResponseEntity.ok(ApiResponse.success(foodCatalogService.getResNetDishes()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FoodItemResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(foodCatalogService.getById(id)));
    }

    @GetMapping("/hotpot/broths")
    public ResponseEntity<ApiResponse<List<FoodItemResponse>>> getHotpotBroths() {
        return ResponseEntity.ok(ApiResponse.success(foodCatalogService.getHotpotBroths()));
    }

    @GetMapping("/hotpot/items")
    public ResponseEntity<ApiResponse<List<FoodItemResponse>>> getHotpotItems() {
        return ResponseEntity.ok(ApiResponse.success(foodCatalogService.getHotpotItems()));
    }
}
