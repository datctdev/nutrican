package com.sba.nutricanbe.payment.repository;

import com.sba.nutricanbe.payment.entity.CoachingEscrow;
import com.sba.nutricanbe.payment.enums.CoachingEscrowStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CoachingEscrowRepository extends JpaRepository<CoachingEscrow, UUID> {

    Optional<CoachingEscrow> findByMappingId(UUID mappingId);

    long countByStatus(CoachingEscrowStatus status);

    long countByStatusIn(java.util.Collection<CoachingEscrowStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select e from CoachingEscrow e
            join fetch e.ptWallet
            join fetch e.escrowWallet
            where e.mappingId = :mappingId
            """)
    Optional<CoachingEscrow> findByMappingIdForUpdate(@Param("mappingId") UUID mappingId);
}
