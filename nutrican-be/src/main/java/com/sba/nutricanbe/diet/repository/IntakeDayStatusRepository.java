package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.IntakeDayStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface IntakeDayStatusRepository extends JpaRepository<IntakeDayStatus, UUID> {

    Optional<IntakeDayStatus> findByUserIdAndLogDate(UUID userId, LocalDate logDate);
}
