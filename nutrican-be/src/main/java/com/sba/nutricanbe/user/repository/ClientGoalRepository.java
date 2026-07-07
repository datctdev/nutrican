package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.ClientGoal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClientGoalRepository extends JpaRepository<ClientGoal, UUID> {
    Optional<ClientGoal> findByUserId(UUID userId);
}
