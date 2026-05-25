package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.BodyMetric;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BodyMetricRepository extends JpaRepository<BodyMetric, UUID> {

    Page<BodyMetric> findByUserIdOrderByRecordDateDesc(UUID userId, Pageable pageable);

    @Query("SELECT b FROM BodyMetric b WHERE b.user.id = :userId AND b.recordDate BETWEEN :start AND :end ORDER BY b.recordDate ASC")
    List<BodyMetric> findByUserIdAndDateRange(
            @Param("userId") UUID userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);

    Optional<BodyMetric> findTopByUserIdOrderByRecordDateDesc(UUID userId);
}
