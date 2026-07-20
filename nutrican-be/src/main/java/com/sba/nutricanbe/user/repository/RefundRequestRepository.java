package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.RefundRequest;
import com.sba.nutricanbe.user.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.UUID;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, UUID> {
    List<RefundRequest> findByStatusOrderByCreatedAtDesc(RefundStatus status);
    List<RefundRequest> findAllByOrderByCreatedAtDesc();
    boolean existsByMappingIdAndStatus(UUID mappingId, RefundStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RefundRequest r WHERE r.id = :id")
    java.util.Optional<RefundRequest> findByIdForUpdate(@Param("id") UUID id);
}
