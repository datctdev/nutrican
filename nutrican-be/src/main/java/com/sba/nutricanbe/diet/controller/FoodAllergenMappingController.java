package com.sba.nutricanbe.diet.controller;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.diet.entity.FoodAllergenMapping;
import com.sba.nutricanbe.diet.enums.AllergenType;
import com.sba.nutricanbe.diet.repository.FoodAllergenMappingRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/allergen-mappings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class FoodAllergenMappingController {

    private final FoodAllergenMappingRepository repository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FoodAllergenMapping>>> list() {
        return ResponseEntity.ok(ApiResponse.success(repository.findAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FoodAllergenMapping>> create(@RequestBody AllergenMappingRequest request) {
        validate(request);
        if (repository.findByFoodCode(request.getFoodCode().trim().toLowerCase()).isPresent()) {
            throw new BadRequestException("Mapping already exists for food code: " + request.getFoodCode());
        }
        FoodAllergenMapping saved = repository.save(FoodAllergenMapping.builder()
                .foodCode(request.getFoodCode().trim().toLowerCase())
                .allergens(request.getAllergens())
                .build());
        return ResponseEntity.ok(ApiResponse.success(saved, "Allergen mapping created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FoodAllergenMapping>> update(
            @PathVariable UUID id, @RequestBody AllergenMappingRequest request) {
        validate(request);
        FoodAllergenMapping mapping = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FoodAllergenMapping", id));
        mapping.setFoodCode(request.getFoodCode().trim().toLowerCase());
        mapping.setAllergens(request.getAllergens());
        return ResponseEntity.ok(ApiResponse.success(repository.save(mapping), "Allergen mapping updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("FoodAllergenMapping", id);
        }
        repository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Allergen mapping deleted"));
    }

    private void validate(AllergenMappingRequest request) {
        if (request.getFoodCode() == null || request.getFoodCode().isBlank()) {
            throw new BadRequestException("foodCode is required");
        }
        if (request.getAllergens() == null || request.getAllergens().isEmpty()) {
            throw new BadRequestException("At least one allergen is required");
        }
    }

    @Data
    public static class AllergenMappingRequest {
        private String foodCode;
        private List<AllergenType> allergens;
    }
}
