package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.entity.PtSlotHold;
import com.sba.nutricanbe.user.enums.SlotHoldStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface SlotHoldService {

    void createHolds(UUID ptId, UUID mappingId, List<LocalDateTime[]> slots);

    void releaseByMapping(UUID mappingId);

    void convertByMapping(UUID mappingId);

    boolean hasActiveHoldOverlap(UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeMappingId);

    void assertNoActiveHoldOverlap(UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeMappingId);

    List<PtSlotHold> getActiveHoldsForPtInRange(UUID ptId, LocalDateTime from, LocalDateTime to);
}
