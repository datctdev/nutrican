package com.sba.nutricanbe.diet.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.request.FoodTagUpdateRequest;
import com.sba.nutricanbe.diet.dto.response.FoodTagDto;
import com.sba.nutricanbe.diet.service.FoodDietTagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/food-tags")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class FoodDietTagController {

    private final FoodDietTagService foodDietTagService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FoodTagDto>>> list() {
        return ResponseEntity.ok(ApiResponse.success(foodDietTagService.listTaggedFoods()));
    }

    @PutMapping("/{foodCode}")
    public ResponseEntity<ApiResponse<FoodTagDto>> update(
            @PathVariable String foodCode,
            @RequestBody FoodTagUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                foodDietTagService.updateTags(foodCode, request), "Diet tags updated"));
    }
}
