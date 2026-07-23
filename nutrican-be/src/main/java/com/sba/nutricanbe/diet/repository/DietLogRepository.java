package com.sba.nutricanbe.diet.repository;

import com.sba.nutricanbe.diet.entity.DietLog;
import com.sba.nutricanbe.diet.enums.DietLogStatus;
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
public interface DietLogRepository extends JpaRepository<DietLog, UUID> {

    Page<DietLog> findByCustomerId(UUID customerId, Pageable pageable);

    Page<DietLog> findByCustomerIdAndLogDateBetween(
            UUID customerId, LocalDate startDate, LocalDate endDate, Pageable pageable);

    Page<DietLog> findByCustomerIdAndStatus(UUID customerId, DietLogStatus status, Pageable pageable);

    Page<DietLog> findByStatus(DietLogStatus status, Pageable pageable);

    @Query("SELECT d FROM DietLog d WHERE d.ptReviewerId = :ptId AND d.status = :status")
    Page<DietLog> findByPtReviewerIdAndStatus(
            @Param("ptId") UUID ptId, @Param("status") DietLogStatus status, Pageable pageable);

    @Query("SELECT d FROM DietLog d WHERE d.customerId = :customerId AND d.logDate = :date")
    List<DietLog> findByCustomerIdAndLogDate(
            @Param("customerId") UUID customerId, @Param("date") LocalDate date);

    @Query("SELECT d FROM DietLog d WHERE d.id = :id")
    Optional<DietLog> findByIdWithCustomer(@Param("id") UUID id);

    @Query("SELECT d FROM DietLog d WHERE d.customerId IN :customerIds AND d.reviewStatus = :reviewStatus")
    Page<DietLog> findByCustomerIdInAndReviewStatus(
            @Param("customerIds") List<UUID> customerIds,
            @Param("reviewStatus") com.sba.nutricanbe.diet.enums.DietLogReviewStatus reviewStatus,
            Pageable pageable);

    /** PENDING có calo — paginate ở DB (PostgreSQL jsonb), không load hết vào RAM. */
    @Query(
            value = """
                    SELECT * FROM diet_logs d
                    WHERE d.customer_id IN (:customerIds)
                      AND d.review_status = :reviewStatus
                      AND d.macros_json IS NOT NULL
                      AND (d.macros_json->>'calories') IS NOT NULL
                      AND (d.macros_json->>'calories') <> 'null'
                    ORDER BY d.created_at DESC
                    """,
            countQuery = """
                    SELECT count(*) FROM diet_logs d
                    WHERE d.customer_id IN (:customerIds)
                      AND d.review_status = :reviewStatus
                      AND d.macros_json IS NOT NULL
                      AND (d.macros_json->>'calories') IS NOT NULL
                      AND (d.macros_json->>'calories') <> 'null'
                    """,
            nativeQuery = true)
    Page<DietLog> findPendingWithCaloriesByCustomerIds(
            @Param("customerIds") List<UUID> customerIds,
            @Param("reviewStatus") String reviewStatus,
            Pageable pageable);

    @Query("SELECT d FROM DietLog d WHERE d.customerId IN :customerIds AND d.status = :status")
    Page<DietLog> findByCustomerIdInAndStatus(
            @Param("customerIds") List<UUID> customerIds,
            @Param("status") DietLogStatus status,
            Pageable pageable);

    @Query("SELECT d FROM DietLog d WHERE d.customerId = :customerId AND d.logDate BETWEEN :startDate AND :endDate AND d.status = :status")
    Page<DietLog> findByCustomerIdAndLogDateBetweenAndStatus(
            @Param("customerId") UUID customerId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("status") DietLogStatus status,
            Pageable pageable);

    List<DietLog> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    boolean existsByCustomerIdAndLogDateAndReviewStatus(
            UUID customerId,
            LocalDate logDate,
            com.sba.nutricanbe.diet.enums.DietLogReviewStatus reviewStatus);

    @Query("SELECT d FROM DietLog d WHERE d.ptReviewedAt IS NOT NULL AND d.logDate BETWEEN :from AND :to ORDER BY d.ptReviewedAt DESC")
    List<DietLog> findReviewedBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT d FROM DietLog d WHERE d.ptReviewedAt IS NOT NULL AND d.customerId IN :customerIds AND d.logDate BETWEEN :from AND :to")
    List<DietLog> findReviewedByCustomersBetween(
            @Param("customerIds") List<UUID> customerIds,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
