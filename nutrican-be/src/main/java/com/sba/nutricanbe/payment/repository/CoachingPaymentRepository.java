package com.sba.nutricanbe.payment.repository;

import com.sba.nutricanbe.payment.entity.Payment;
import com.sba.nutricanbe.payment.enums.CoachingPaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CoachingPaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByTxnRef(String txnRef);

    boolean existsByOrderNumber(String orderNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p join fetch p.mapping where p.txnRef = :txnRef")
    Optional<Payment> findByTxnRefForUpdate(@Param("txnRef") String txnRef);

    boolean existsByMapping_IdAndStatus(UUID mappingId, CoachingPaymentStatus status);

    Optional<Payment> findFirstByMapping_IdAndStatusOrderByCreatedAtDesc(
            UUID mappingId, CoachingPaymentStatus status);
}
