package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.WeeklySummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WeeklySummaryRepository extends JpaRepository<WeeklySummary, UUID> {
    List<WeeklySummary> findByClientIdOrderByWeekStartDateDesc(UUID clientId);

    Optional<WeeklySummary> findByPtIdAndClientIdAndWeekStartDate(
            UUID ptId, UUID clientId, LocalDate weekStartDate);
}
