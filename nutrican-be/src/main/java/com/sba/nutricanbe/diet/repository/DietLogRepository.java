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

    @Query("SELECT d FROM DietLog d WHERE d.sosTicketFlag = true AND d.status = :status")
    Page<DietLog> findSosTickets(@Param("status") DietLogStatus status, Pageable pageable);

    @Query("SELECT d FROM DietLog d WHERE d.id = :id")
    Optional<DietLog> findByIdWithCustomer(@Param("id") UUID id);

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

    @Query("SELECT d FROM DietLog d WHERE d.ptReviewedAt IS NOT NULL AND d.logDate BETWEEN :from AND :to ORDER BY d.ptReviewedAt DESC")
    List<DietLog> findReviewedBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT d FROM DietLog d WHERE d.ptReviewedAt IS NOT NULL AND d.customerId IN :customerIds AND d.logDate BETWEEN :from AND :to")
    List<DietLog> findReviewedByCustomersBetween(
            @Param("customerIds") List<UUID> customerIds,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
