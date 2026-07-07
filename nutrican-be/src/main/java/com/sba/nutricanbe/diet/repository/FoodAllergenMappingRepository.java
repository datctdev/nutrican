package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.FoodAllergenMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FoodAllergenMappingRepository extends JpaRepository<FoodAllergenMapping, UUID> {
    Optional<FoodAllergenMapping> findByFoodCode(String foodCode);
}
