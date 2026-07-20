package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.dto.OccupiedSlotResponse;
import com.sba.nutricanbe.user.dto.PtCalendarResponse;
import com.sba.nutricanbe.user.entity.PtAppointment;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtSlotHold;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtAvailabilityWindowRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PtCalendarService {

    private final PtProfileRepository ptProfileRepository;
    private final PtVenueAvailabilityService venueAvailabilityService;
    private final PtAppointmentRepository appointmentRepository;
    private final SlotHoldService slotHoldService;
    private final AppointmentSlotHelper appointmentSlotHelper;
    private final PtAvailabilityWindowRepository availabilityRepository;

    @Transactional(readOnly = true)
    public ApiResponse<PtCalendarResponse> getCalendar(UUID profileId, LocalDateTime from, LocalDateTime to) {
        PtProfile profile = ptProfileRepository.findByIdWithUser(profileId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", profileId));

        if (from == null) {
            from = LocalDateTime.now();
        }
        if (to == null) {
            to = from.plusWeeks(8);
        }

        UUID ptUserId = profile.getUser().getId();
        List<OccupiedSlotResponse> occupied = new ArrayList<>();

        List<PtAppointment> appointments = appointmentRepository.findOverlapping(
                ptUserId, from, to, List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED));
        for (PtAppointment appt : appointments) {
            occupied.add(OccupiedSlotResponse.builder()
                    .startTime(appt.getStartTime())
                    .endTime(appt.getEndTime())
                    .source("APPOINTMENT")
                    .build());
        }

        List<PtSlotHold> holds = slotHoldService.getActiveHoldsForPtInRange(ptUserId, from, to);
        for (PtSlotHold hold : holds) {
            occupied.add(OccupiedSlotResponse.builder()
                    .startTime(hold.getStartTime())
                    .endTime(hold.getEndTime())
                    .source("HOLD")
                    .build());
        }

        Integer slotMinutes = availabilityRepository
                .findByPtProfile_IdOrderByDayOfWeekAscStartTimeAsc(profile.getId())
                .stream()
                .findFirst()
                .map(w -> w.getSlotMinutes())
                .orElse(appointmentSlotHelper.sessionMinutesFromRateUnit(profile.getOfflineRateUnit()));

        PtCalendarResponse response = PtCalendarResponse.builder()
                .venues(venueAvailabilityService.listActiveVenuesForProfile(profile.getId()))
                .availability(venueAvailabilityService.listAvailabilityForProfile(profile.getId()))
                .occupiedSlots(occupied)
                .offlineRate(profile.getOfflineRate())
                .offlineRateUnit(profile.getOfflineRateUnit())
                .slotMinutes(slotMinutes)
                .build();

        return ApiResponse.success(response);
    }
}
