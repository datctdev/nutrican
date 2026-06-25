package com.sba.nutricanbe.diet.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.FoodItemResponse;
import com.sba.nutricanbe.diet.service.FoodCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(ApiResponse.success(foodCatalogService.search(q, category)));
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
