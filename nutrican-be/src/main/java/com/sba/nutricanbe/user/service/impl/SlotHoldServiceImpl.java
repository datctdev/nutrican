package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.entity.PtSlotHold;
import com.sba.nutricanbe.user.enums.SlotHoldStatus;
import com.sba.nutricanbe.user.repository.PtSlotHoldRepository;
import com.sba.nutricanbe.user.service.SlotHoldService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SlotHoldServiceImpl implements SlotHoldService {

    private final PtSlotHoldRepository slotHoldRepository;

    @Override
    @Transactional
    public void createHolds(UUID ptId, UUID mappingId, List<LocalDateTime[]> slots) {
        List<PtSlotHold> holds = new ArrayList<>();
        for (LocalDateTime[] slot : slots) {
            holds.add(PtSlotHold.builder()
                    .ptId(ptId)
                    .mappingId(mappingId)
                    .startTime(slot[0])
                    .endTime(slot[1])
                    .status(SlotHoldStatus.ACTIVE)
                    .build());
        }
        slotHoldRepository.saveAll(holds);
    }

    @Override
    @Transactional
    public void releaseByMapping(UUID mappingId) {
        slotHoldRepository.findByMappingIdAndStatus(mappingId, SlotHoldStatus.ACTIVE)
                .forEach(hold -> hold.setStatus(SlotHoldStatus.RELEASED));
    }

    @Override
    @Transactional
    public void convertByMapping(UUID mappingId) {
        slotHoldRepository.findByMappingIdAndStatus(mappingId, SlotHoldStatus.ACTIVE)
                .forEach(hold -> hold.setStatus(SlotHoldStatus.CONVERTED));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveHoldOverlap(
            UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeMappingId) {
        List<PtSlotHold> overlaps = slotHoldRepository.findOverlappingActive(
                ptId, start, end, SlotHoldStatus.ACTIVE);
        if (excludeMappingId != null) {
            overlaps = overlaps.stream()
                    .filter(h -> !h.getMappingId().equals(excludeMappingId))
                    .toList();
        }
        return !overlaps.isEmpty();
    }

    @Override
    @Transactional(readOnly = true)
    public void assertNoActiveHoldOverlap(
            UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeMappingId) {
        if (hasActiveHoldOverlap(ptId, start, end, excludeMappingId)) {
            throw new BadRequestException("PT has a held slot at the selected time");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtSlotHold> getActiveHoldsForPtInRange(UUID ptId, LocalDateTime from, LocalDateTime to) {
        return slotHoldRepository.findOverlappingActive(ptId, from, to, SlotHoldStatus.ACTIVE);
    }
}
