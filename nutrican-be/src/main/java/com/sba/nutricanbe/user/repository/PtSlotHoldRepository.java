package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.PtSlotHold;
import com.sba.nutricanbe.user.enums.SlotHoldStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PtSlotHoldRepository extends JpaRepository<PtSlotHold, UUID> {

    List<PtSlotHold> findByMappingId(UUID mappingId);

    List<PtSlotHold> findByMappingIdAndStatus(UUID mappingId, SlotHoldStatus status);

    @Query("SELECT h FROM PtSlotHold h WHERE h.ptId = :ptId AND h.status = :status "
            + "AND h.startTime < :endTime AND h.endTime > :startTime")
    List<PtSlotHold> findOverlappingActive(
            @Param("ptId") UUID ptId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("status") SlotHoldStatus status);
}
