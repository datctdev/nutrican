package com.sba.nutricanbe.diet.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.diet.dto.request.RecipeRequest;
import com.sba.nutricanbe.diet.dto.response.RecipeResponse;
import com.sba.nutricanbe.diet.service.UserRecipeService;
import com.sba.nutricanbe.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/diet/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final UserRecipeService userRecipeService;

    @PostMapping
    public ResponseEntity<ApiResponse<RecipeResponse>> create(
            @AuthenticationPrincipal User user,
            @RequestBody RecipeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userRecipeService.create(user.getId(), request), "Recipe created"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RecipeResponse>>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success(userRecipeService.list(user.getId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RecipeResponse>> get(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userRecipeService.get(user.getId(), id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RecipeResponse>> update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestBody RecipeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userRecipeService.update(user.getId(), id, request), "Recipe updated"));
    }
}
