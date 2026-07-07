package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.WeeklySummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WeeklySummaryRepository extends JpaRepository<WeeklySummary, UUID> {
    List<WeeklySummary> findByClientIdOrderByWeekStartDateDesc(UUID clientId);
}
