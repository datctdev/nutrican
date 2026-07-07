package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.UserRecipe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserRecipeRepository extends JpaRepository<UserRecipe, UUID> {
    List<UserRecipe> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}
