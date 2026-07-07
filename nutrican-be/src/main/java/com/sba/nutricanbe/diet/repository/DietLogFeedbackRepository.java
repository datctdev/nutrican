package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.DietLogFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DietLogFeedbackRepository extends JpaRepository<DietLogFeedback, UUID> {
    Optional<DietLogFeedback> findByDietLogId(UUID dietLogId);
    List<DietLogFeedback> findByDietLogIdIn(List<UUID> dietLogIds);
}
