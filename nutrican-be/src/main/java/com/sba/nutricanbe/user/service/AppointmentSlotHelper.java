package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.user.dto.PtAvailabilityWindowResponse;
import com.sba.nutricanbe.user.entity.PtAvailabilityWindow;
import com.sba.nutricanbe.user.enums.AppointmentStatus;
import com.sba.nutricanbe.user.repository.PtAppointmentRepository;
import com.sba.nutricanbe.user.repository.PtAvailabilityWindowRepository;
import com.sba.nutricanbe.user.repository.PtSlotHoldRepository;
import com.sba.nutricanbe.user.enums.SlotHoldStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppointmentSlotHelper {

    private static final int MIN_MINUTES = 30;
    private static final int MAX_MINUTES = 120;

    private final PtAppointmentRepository appointmentRepository;
    private final PtAvailabilityWindowRepository availabilityRepository;
    private final PtSlotHoldRepository slotHoldRepository;

    public void validateSlot(LocalDateTime start, LocalDateTime end) {
        if (!end.isAfter(start)) {
            throw new BadRequestException("Giờ kết thúc phải sau giờ bắt đầu");
        }
        long minutes = Duration.between(start, end).toMinutes();
        if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
            throw new BadRequestException("Mỗi buổi tập phải từ 30 đến 120 phút");
        }
    }

    public boolean hasOverlap(UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeApptId) {
        if (hasAppointmentOverlap(ptId, start, end, excludeApptId)) {
            return true;
        }
        return hasHoldOverlap(ptId, start, end, null);
    }

    public boolean hasOverlapExcludingMapping(
            UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeMappingId) {
        if (hasAppointmentOverlap(ptId, start, end, null)) {
            return true;
        }
        return hasHoldOverlap(ptId, start, end, excludeMappingId);
    }

    public void assertNoOverlap(UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeApptId) {
        if (hasOverlap(ptId, start, end, excludeApptId)) {
            throw new BadRequestException("Khung giờ này trùng lịch hẹn hoặc slot đang giữ của PT");
        }
    }

    public void assertNoOverlapExcludingMapping(
            UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeMappingId) {
        if (hasOverlapExcludingMapping(ptId, start, end, excludeMappingId)) {
            throw new BadRequestException("Khung giờ này trùng lịch hẹn hoặc slot đang giữ của PT");
        }
    }

    public void assertSessionsDoNotOverlapEachOther(List<LocalDateTime[]> slots) {
        for (int i = 0; i < slots.size(); i++) {
            LocalDateTime[] left = slots.get(i);
            for (int j = i + 1; j < slots.size(); j++) {
                LocalDateTime[] right = slots.get(j);
                if (left[0].isBefore(right[1]) && right[0].isBefore(left[1])) {
                    throw new BadRequestException("Các buổi đã chọn trùng giờ với nhau");
                }
            }
        }
    }

    private boolean hasAppointmentOverlap(
            UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeApptId) {
        List<com.sba.nutricanbe.user.entity.PtAppointment> overlaps = appointmentRepository.findOverlapping(
                ptId, start, end, List.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED));
        if (excludeApptId != null) {
            overlaps = overlaps.stream().filter(a -> !a.getId().equals(excludeApptId)).toList();
        }
        return !overlaps.isEmpty();
    }

    private boolean hasHoldOverlap(
            UUID ptId, LocalDateTime start, LocalDateTime end, UUID excludeMappingId) {
        List<com.sba.nutricanbe.user.entity.PtSlotHold> overlaps = slotHoldRepository.findOverlappingActive(
                ptId, start, end, SlotHoldStatus.ACTIVE);
        if (excludeMappingId != null) {
            overlaps = overlaps.stream()
                    .filter(h -> !h.getMappingId().equals(excludeMappingId))
                    .toList();
        }
        return !overlaps.isEmpty();
    }

    public int sessionMinutesFromRateUnit(String rateUnit) {
        if ("SESSION_90".equalsIgnoreCase(rateUnit)) {
            return 90;
        }
        if ("SESSION_60".equalsIgnoreCase(rateUnit)) {
            return 60;
        }
        return 60;
    }

    public LocalDateTime computeSessionEnd(LocalDateTime start, String rateUnit) {
        return start.plusMinutes(sessionMinutesFromRateUnit(rateUnit));
    }

    @Transactional(readOnly = true)
    public void assertSlotWithinAvailability(UUID ptProfileId, LocalDateTime start, LocalDateTime end) {
        List<PtAvailabilityWindow> windows = availabilityRepository
                .findByPtProfile_IdOrderByDayOfWeekAscStartTimeAsc(ptProfileId);
        if (windows.isEmpty()) {
            throw new BadRequestException("PT chưa cấu hình khung giờ nhận học viên");
        }
        DayOfWeek day = start.getDayOfWeek();
        int dayOfWeek = day.getValue();
        LocalTime slotStart = start.toLocalTime();
        LocalTime slotEnd = end.toLocalTime();
        if (!start.toLocalDate().equals(end.toLocalDate())) {
            throw new BadRequestException("Buổi tập phải bắt đầu và kết thúc trong cùng một ngày");
        }
        boolean fits = windows.stream()
                .filter(window -> window.getDayOfWeek().equals(dayOfWeek))
                .anyMatch(window -> !slotStart.isBefore(window.getStartTime())
                        && !slotEnd.isAfter(window.getEndTime()));
        if (!fits) {
            throw new BadRequestException("Khung giờ nằm ngoài lịch nhận học viên của PT");
        }
    }

    public void assertSlotWithinAvailabilityWindows(
            List<PtAvailabilityWindowResponse> windows,
            LocalDateTime start,
            LocalDateTime end) {
        if (windows == null || windows.isEmpty()) {
            throw new BadRequestException("PT chưa cấu hình khung giờ nhận học viên");
        }
        int dayOfWeek = start.getDayOfWeek().getValue();
        LocalTime slotStart = start.toLocalTime();
        LocalTime slotEnd = end.toLocalTime();
        if (!start.toLocalDate().equals(end.toLocalDate())) {
            throw new BadRequestException("Buổi tập phải bắt đầu và kết thúc trong cùng một ngày");
        }
        boolean fits = windows.stream()
                .filter(window -> window.getDayOfWeek().equals(dayOfWeek))
                .anyMatch(window -> !slotStart.isBefore(window.getStartTime())
                        && !slotEnd.isAfter(window.getEndTime()));
        if (!fits) {
            throw new BadRequestException("Khung giờ nằm ngoài lịch nhận học viên của PT");
        }
    }
}
