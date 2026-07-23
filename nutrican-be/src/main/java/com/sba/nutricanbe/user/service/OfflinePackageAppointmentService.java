package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtMappingSession;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtMappingSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OfflinePackageAppointmentService {

    private final PtAppointmentRepository appointmentRepository;
    private final PtMappingSessionRepository mappingSessionRepository;
    private final AppointmentSlotHelper appointmentSlotHelper;
    private final SlotHoldService slotHoldService;

    @Transactional
    public void materializeOfflinePackageIfNeeded(PtClientMapping mapping) {
        if (mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            return;
        }

        List<PtMappingSession> sessions = mappingSessionRepository
                .findByMappingIdOrderBySequenceAsc(mapping.getId());
        if (sessions.isEmpty()) {
            materializeLegacySingleSession(mapping);
            return;
        }

        List<PtMappingSession> liveSessions = sessions.stream()
                .filter(s -> s.getStatus() != com.sba.nutricanbe.user.enums.MappingSessionStatus.CANCELLED)
                .toList();
        if (liveSessions.isEmpty()) {
            slotHoldService.convertByMapping(mapping.getId());
            return;
        }

        List<PtAppointment> activeAppts = appointmentRepository.findByMappingId(mapping.getId()).stream()
                .filter(a -> a.getStatus() != AppointmentStatus.CANCELLED
                        && a.getStatus() != AppointmentStatus.EXPIRED)
                .toList();
        if (activeAppts.size() >= liveSessions.size()) {
            slotHoldService.convertByMapping(mapping.getId());
            return;
        }

        int sequence = 1;
        for (PtMappingSession session : liveSessions) {
            boolean alreadyLinked = activeAppts.stream().anyMatch(a ->
                    session.getId().equals(a.getMappingSessionId())
                            || (a.getStartTime() != null && a.getStartTime().equals(session.getStartTime())));
            if (alreadyLinked) {
                sequence++;
                continue;
            }

            AppointmentStatus status = AppointmentStatus.CONFIRMED;
            if (appointmentSlotHelper.hasOverlapExcludingMapping(
                    mapping.getPt().getId(),
                    session.getStartTime(),
                    session.getEndTime(),
                    mapping.getId())) {
                log.warn("Session {} overlap for mapping {} — PENDING fallback",
                        session.getStartTime(), mapping.getId());
                status = AppointmentStatus.PENDING;
            }

            String note = liveSessions.size() == 1
                    ? "Buổi tập đầu tiên"
                    : "Buổi offline #" + sequence + " / " + liveSessions.size();

            appointmentRepository.save(PtAppointment.builder()
                    .clientId(mapping.getClient().getId())
                    .ptId(mapping.getPt().getId())
                    .mappingId(mapping.getId())
                    .mappingSessionId(session.getId())
                    .startTime(session.getStartTime())
                    .endTime(session.getEndTime())
                    .type("OFFLINE")
                    .note(note)
                    .status(status)
                    .venueName(session.getVenueName())
                    .venueAddress(session.getVenueAddress())
                    .venueMapsUrl(session.getVenueMapsUrl())
                    .build());
            sequence++;
        }

        slotHoldService.convertByMapping(mapping.getId());
    }

    private void materializeLegacySingleSession(PtClientMapping mapping) {
        if (mapping.getFirstSessionStart() == null) {
            return;
        }
        if (appointmentRepository.existsByMappingId(mapping.getId())) {
            return;
        }

        var start = mapping.getFirstSessionStart();
        var end = mapping.getFirstSessionEnd() != null
                ? mapping.getFirstSessionEnd()
                : appointmentSlotHelper.computeSessionEnd(start, mapping.getAgreedRateUnit());

        AppointmentStatus status = AppointmentStatus.CONFIRMED;
        if (appointmentSlotHelper.hasOverlapExcludingMapping(
                mapping.getPt().getId(), start, end, mapping.getId())) {
            status = AppointmentStatus.PENDING;
        }

        appointmentRepository.save(PtAppointment.builder()
                .clientId(mapping.getClient().getId())
                .ptId(mapping.getPt().getId())
                .mappingId(mapping.getId())
                .startTime(start)
                .endTime(end)
                .type("OFFLINE")
                .note("Buổi tập đầu tiên")
                .status(status)
                .venueName(mapping.getVenueName())
                .venueAddress(mapping.getVenueAddress())
                .venueMapsUrl(mapping.getVenueMapsUrl())
                .build());
        slotHoldService.convertByMapping(mapping.getId());
    }
}
