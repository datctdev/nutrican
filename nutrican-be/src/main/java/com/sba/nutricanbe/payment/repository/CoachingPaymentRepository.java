package com.sba.nutricanbe.payment.repository;

import com.sba.nutricanbe.payment.entity.Payment;
import com.sba.nutricanbe.payment.enums.CoachingPaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CoachingPaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByTxnRef(String txnRef);

    boolean existsByOrderNumber(String orderNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.txnRef = :txnRef")
    Optional<Payment> findByTxnRefForUpdate(@Param("txnRef") String txnRef);

    boolean existsByMappingIdAndStatus(UUID mappingId, CoachingPaymentStatus status);

    Optional<Payment> findFirstByMappingIdAndStatusOrderByCreatedAtDesc(
            UUID mappingId, CoachingPaymentStatus status);

    List<Payment> findByStatusAndExpiresAtBefore(
            CoachingPaymentStatus status, LocalDateTime expiresAt);
}
