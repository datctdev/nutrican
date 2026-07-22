package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.dto.PtAvailabilityWindowResponse;
import com.sba.nutricanbe.user.entity.PtMappingSession;
import com.sba.nutricanbe.user.entity.PtVenue;
import com.sba.nutricanbe.user.enums.MappingSessionStatus;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OfflineHireSessionService {

    private final PtMappingSessionRepository mappingSessionRepository;
    private final AppointmentSlotHelper appointmentSlotHelper;
    private final SlotHoldService slotHoldService;

    public record ValidatedOfflineHire(
            List<LocalDateTime[]> slots,
            LocalDateTime earliestStart,
            LocalDateTime earliestEnd,
            int sessionCount) {}

    @Transactional(readOnly = true)
    public ValidatedOfflineHire validateOfflineSessions(
            UUID ptUserId,
            UUID ptProfileId,
            List<PtAvailabilityWindowResponse> availability,
            String rateUnit,
            List<LocalDateTime> sessionStarts,
            UUID excludeMappingId) {

        if (sessionStarts == null || sessionStarts.isEmpty()) {
            throw new BadRequestException("Please select at least one session");
        }

        List<LocalDateTime[]> slots = new ArrayList<>();
        for (LocalDateTime start : sessionStarts) {
            if (start == null) {
                throw new BadRequestException("Invalid session time");
            }
            if (start.isBefore(LocalDateTime.now())) {
                throw new BadRequestException("All sessions must be in the future");
            }
            LocalDateTime end = appointmentSlotHelper.computeSessionEnd(start, rateUnit);
            appointmentSlotHelper.validateSlot(start, end);
            appointmentSlotHelper.assertSlotWithinAvailabilityWindows(availability, start, end);
            appointmentSlotHelper.assertNoOverlapExcludingMapping(ptUserId, start, end, excludeMappingId);
            slots.add(new LocalDateTime[] { start, end });
        }

        appointmentSlotHelper.assertSessionsDoNotOverlapEachOther(slots);
        slots.sort(Comparator.comparing(s -> s[0]));
        return new ValidatedOfflineHire(
                slots,
                slots.get(0)[0],
                slots.get(0)[1],
                slots.size());
    }

    @Transactional
    public void persistSessionsAndHolds(
            UUID mappingId,
            UUID ptUserId,
            PtVenue venue,
            ValidatedOfflineHire validated) {
        mappingSessionRepository.deleteByMappingId(mappingId);

        int sequence = 1;
        for (LocalDateTime[] slot : validated.slots()) {
            mappingSessionRepository.save(PtMappingSession.builder()
                    .mappingId(mappingId)
                    .sequence(sequence++)
                    .startTime(slot[0])
                    .endTime(slot[1])
                    .venueId(venue.getId())
                    .venueName(venue.getName())
                    .venueAddress(venue.getAddress())
                    .venueMapsUrl(venue.getMapsUrl())
                    .status(MappingSessionStatus.SCHEDULED)
                    .build());
        }

        slotHoldService.releaseByMapping(mappingId);
        slotHoldService.createHolds(ptUserId, mappingId, validated.slots());
    }

    /**
     * Append extra paid sessions without deleting existing package sessions.
     * Venue snapshot comes from the active mapping (same gym as the package).
     * Does not create slot holds — caller already holds the slots for pending payment.
     */
    @Transactional
    public void appendSessionsWithoutHolds(
            UUID mappingId,
            UUID venueId,
            String venueName,
            String venueAddress,
            String venueMapsUrl,
            ValidatedOfflineHire validated) {
        int sequence = mappingSessionRepository.findByMappingIdOrderBySequenceAsc(mappingId).stream()
                .mapToInt(PtMappingSession::getSequence)
                .max()
                .orElse(0) + 1;

        for (LocalDateTime[] slot : validated.slots()) {
            mappingSessionRepository.save(PtMappingSession.builder()
                    .mappingId(mappingId)
                    .sequence(sequence++)
                    .startTime(slot[0])
                    .endTime(slot[1])
                    .venueId(venueId)
                    .venueName(venueName)
                    .venueAddress(venueAddress)
                    .venueMapsUrl(venueMapsUrl)
                    .status(MappingSessionStatus.SCHEDULED)
                    .build());
        }
    }

    @Transactional
    public void appendSessionsAndHolds(
            UUID mappingId,
            UUID ptUserId,
            String venueName,
            String venueAddress,
            String venueMapsUrl,
            UUID venueId,
            ValidatedOfflineHire validated) {
        appendSessionsWithoutHolds(mappingId, venueId, venueName, venueAddress, venueMapsUrl, validated);
        slotHoldService.createHolds(ptUserId, mappingId, validated.slots());
    }

    @Transactional(readOnly = true)
    public void revalidateForAccept(UUID ptUserId, UUID mappingId, String rateUnit) {
        List<PtMappingSession> sessions = mappingSessionRepository
                .findByMappingIdOrderBySequenceAsc(mappingId);
        if (sessions.isEmpty()) {
            throw new BadRequestException("Offline package has no sessions");
        }
        for (PtMappingSession session : sessions) {
            appointmentSlotHelper.validateSlot(session.getStartTime(), session.getEndTime());
            appointmentSlotHelper.assertNoOverlapExcludingMapping(
                    ptUserId, session.getStartTime(), session.getEndTime(), mappingId);
        }
    }
}
