package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.DietLog;
import com.sba.nutrican_be.core.enums.DietLogStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DietLogRepository extends JpaRepository<DietLog, Long> {

    Page<DietLog> findByCustomerId(Long customerId, Pageable pageable);

    Page<DietLog> findByCustomerIdAndLogDateBetween(
            Long customerId, LocalDate startDate, LocalDate endDate, Pageable pageable);

    Page<DietLog> findByCustomerIdAndStatus(Long customerId, DietLogStatus status, Pageable pageable);

    Page<DietLog> findByStatus(DietLogStatus status, Pageable pageable);

    @Query("SELECT d FROM DietLog d WHERE d.ptReviewer.id = :ptId AND d.status = :status")
    Page<DietLog> findByPtReviewerIdAndStatus(
            @Param("ptId") Long ptId, @Param("status") DietLogStatus status, Pageable pageable);

    @Query("SELECT d FROM DietLog d WHERE d.customer.id = :customerId AND d.logDate = :date")
    List<DietLog> findByCustomerIdAndLogDate(
            @Param("customerId") Long customerId, @Param("date") LocalDate date);

    @Query("SELECT d FROM DietLog d WHERE d.sosTicketFlag = true AND d.status = :status")
    Page<DietLog> findSosTickets(@Param("status") DietLogStatus status, Pageable pageable);

    @Query("SELECT d FROM DietLog d LEFT JOIN FETCH d.customer WHERE d.id = :id")
    Optional<DietLog> findByIdWithCustomer(@Param("id") Long id);
}
