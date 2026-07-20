package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class FirstSessionAppointmentService {

    private final PtAppointmentRepository appointmentRepository;
    private final AppointmentSlotHelper appointmentSlotHelper;

    @Transactional
    public void materializeFirstSessionIfOffline(PtClientMapping mapping) {
        if (mapping.getSelectedTrainingMode() != TrainingMode.OFFLINE) {
            return;
        }
        if (mapping.getFirstSessionStart() == null) {
            return;
        }
        if (appointmentRepository.existsByMappingId(mapping.getId())) {
            return;
        }

        LocalDateTime start = mapping.getFirstSessionStart();
        LocalDateTime end = mapping.getFirstSessionEnd() != null
                ? mapping.getFirstSessionEnd()
                : appointmentSlotHelper.computeSessionEnd(start, mapping.getAgreedRateUnit());

        AppointmentStatus status = AppointmentStatus.CONFIRMED;
        if (appointmentSlotHelper.hasOverlap(
                mapping.getPt().getId(), start, end, null)) {
            log.warn(
                    "First session overlap for mapping {} — creating PENDING appointment for PT review",
                    mapping.getId());
            status = AppointmentStatus.PENDING;
        }

        PtAppointment appointment = PtAppointment.builder()
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
                .build();
        appointmentRepository.save(appointment);
    }
}
