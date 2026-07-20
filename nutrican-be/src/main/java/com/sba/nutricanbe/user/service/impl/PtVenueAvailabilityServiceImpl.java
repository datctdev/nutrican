package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.dto.PtAvailabilityWindowRequest;
import com.sba.nutricanbe.user.dto.PtAvailabilityWindowResponse;
import com.sba.nutricanbe.user.dto.PtVenueRequest;
import com.sba.nutricanbe.user.dto.PtVenueResponse;
import com.sba.nutricanbe.user.dto.UpdatePtAvailabilityRequest;
import com.sba.nutricanbe.user.entity.PtAvailabilityWindow;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtVenue;
import com.sba.nutricanbe.user.repository.PtAvailabilityWindowRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.PtVenueRepository;
import com.sba.nutricanbe.user.service.PtVenueAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PtVenueAvailabilityServiceImpl implements PtVenueAvailabilityService {

    private final PtProfileRepository ptProfileRepository;
    private final PtVenueRepository venueRepository;
    private final PtAvailabilityWindowRepository availabilityRepository;

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<PtVenueResponse>> listVenues(UUID ptUserId) {
        PtProfile profile = requirePtProfile(ptUserId);
        List<PtVenueResponse> venues = venueRepository.findByPtProfile_IdOrderByCreatedAtAsc(profile.getId())
                .stream()
                .map(PtVenueResponse::from)
                .toList();
        return ApiResponse.success(venues);
    }

    @Override
    @Transactional
    public ApiResponse<PtVenueResponse> createVenue(UUID ptUserId, PtVenueRequest request) {
        PtProfile profile = requirePtProfile(ptUserId);
        PtVenue venue = PtVenue.builder()
                .ptProfile(profile)
                .name(request.getName().trim())
                .address(request.getAddress().trim())
                .mapsUrl(trimOrNull(request.getMapsUrl()))
                .note(trimOrNull(request.getNote()))
                .active(true)
                .build();
        venue = venueRepository.save(venue);
        return ApiResponse.success(PtVenueResponse.from(venue), "Venue created");
    }

    @Override
    @Transactional
    public ApiResponse<PtVenueResponse> updateVenue(UUID ptUserId, UUID venueId, PtVenueRequest request) {
        PtProfile profile = requirePtProfile(ptUserId);
        PtVenue venue = venueRepository.findByIdAndPtProfile_Id(venueId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("PT venue", venueId));
        venue.setName(request.getName().trim());
        venue.setAddress(request.getAddress().trim());
        venue.setMapsUrl(trimOrNull(request.getMapsUrl()));
        venue.setNote(trimOrNull(request.getNote()));
        venue = venueRepository.save(venue);
        return ApiResponse.success(PtVenueResponse.from(venue), "Venue updated");
    }

    @Override
    @Transactional
    public ApiResponse<PtVenueResponse> deactivateVenue(UUID ptUserId, UUID venueId) {
        PtProfile profile = requirePtProfile(ptUserId);
        PtVenue venue = venueRepository.findByIdAndPtProfile_Id(venueId, profile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("PT venue", venueId));
        venue.setActive(false);
        venue = venueRepository.save(venue);
        return ApiResponse.success(PtVenueResponse.from(venue), "Venue deactivated");
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<PtAvailabilityWindowResponse>> getAvailability(UUID ptUserId) {
        PtProfile profile = requirePtProfile(ptUserId);
        return ApiResponse.success(listAvailabilityForProfile(profile.getId()));
    }

    @Override
    @Transactional
    public ApiResponse<List<PtAvailabilityWindowResponse>> replaceAvailability(
            UUID ptUserId, UpdatePtAvailabilityRequest request) {
        PtProfile profile = requirePtProfile(ptUserId);
        validateAvailabilityWindows(request.getWindows());
        availabilityRepository.deleteByPtProfile_Id(profile.getId());
        List<PtAvailabilityWindow> saved = new ArrayList<>();
        for (PtAvailabilityWindowRequest windowRequest : request.getWindows()) {
            PtAvailabilityWindow window = PtAvailabilityWindow.builder()
                    .ptProfile(profile)
                    .dayOfWeek(windowRequest.getDayOfWeek())
                    .startTime(windowRequest.getStartTime())
                    .endTime(windowRequest.getEndTime())
                    .slotMinutes(windowRequest.getSlotMinutes() != null
                            ? windowRequest.getSlotMinutes() : 60)
                    .build();
            saved.add(availabilityRepository.save(window));
        }
        saved.sort(Comparator.comparing(PtAvailabilityWindow::getDayOfWeek)
                .thenComparing(PtAvailabilityWindow::getStartTime));
        List<PtAvailabilityWindowResponse> response = saved.stream()
                .map(PtAvailabilityWindowResponse::from)
                .toList();
        return ApiResponse.success(response, "Availability updated");
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtVenueResponse> listActiveVenuesForProfile(UUID ptProfileId) {
        return venueRepository.findByPtProfile_IdAndActiveTrueOrderByCreatedAtAsc(ptProfileId)
                .stream()
                .map(PtVenueResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PtAvailabilityWindowResponse> listAvailabilityForProfile(UUID ptProfileId) {
        return availabilityRepository.findByPtProfile_IdOrderByDayOfWeekAscStartTimeAsc(ptProfileId)
                .stream()
                .map(PtAvailabilityWindowResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public void setupOfflineScheduleFromRegistration(
            PtProfile profile,
            List<PtVenueRequest> venues,
            List<PtAvailabilityWindowRequest> windows,
            String offlineRateUnit) {
        if (venues == null || venues.isEmpty()) {
            throw new BadRequestException("At least one training venue is required");
        }
        validateAvailabilityWindows(windows);
        if (windows == null || windows.isEmpty()) {
            throw new BadRequestException("Weekly availability schedule is required");
        }
        int expectedSlotMinutes = "SESSION_90".equalsIgnoreCase(offlineRateUnit) ? 90 : 60;
        for (PtAvailabilityWindowRequest window : windows) {
            int slotMinutes = window.getSlotMinutes() != null ? window.getSlotMinutes() : expectedSlotMinutes;
            if (slotMinutes != expectedSlotMinutes) {
                throw new BadRequestException(
                        "Slot duration must match offline session length (" + expectedSlotMinutes + " minutes)");
            }
            window.setSlotMinutes(expectedSlotMinutes);
        }

        availabilityRepository.deleteByPtProfile_Id(profile.getId());
        venueRepository.deleteByPtProfile_Id(profile.getId());
        for (PtVenueRequest venueRequest : venues) {
            venueRepository.save(PtVenue.builder()
                    .ptProfile(profile)
                    .name(venueRequest.getName().trim())
                    .address(venueRequest.getAddress().trim())
                    .mapsUrl(trimOrNull(venueRequest.getMapsUrl()))
                    .note(trimOrNull(venueRequest.getNote()))
                    .active(true)
                    .build());
        }
        for (PtAvailabilityWindowRequest windowRequest : windows) {
            availabilityRepository.save(PtAvailabilityWindow.builder()
                    .ptProfile(profile)
                    .dayOfWeek(windowRequest.getDayOfWeek())
                    .startTime(windowRequest.getStartTime())
                    .endTime(windowRequest.getEndTime())
                    .slotMinutes(windowRequest.getSlotMinutes())
                    .build());
        }
    }

    private PtProfile requirePtProfile(UUID ptUserId) {
        return ptProfileRepository.findByUserId(ptUserId)
                .orElseThrow(() -> new ResourceNotFoundException("PT Profile", ptUserId));
    }

    private void validateAvailabilityWindows(List<PtAvailabilityWindowRequest> windows) {
        if (windows == null) {
            throw new BadRequestException("Availability windows are required");
        }
        for (PtAvailabilityWindowRequest window : windows) {
            if (window.getStartTime() == null || window.getEndTime() == null) {
                throw new BadRequestException("Start and end time are required for each availability window");
            }
            if (!window.getEndTime().isAfter(window.getStartTime())) {
                throw new BadRequestException("Availability end time must be after start time");
            }
        }
        for (int i = 0; i < windows.size(); i++) {
            PtAvailabilityWindowRequest left = windows.get(i);
            for (int j = i + 1; j < windows.size(); j++) {
                PtAvailabilityWindowRequest right = windows.get(j);
                if (!left.getDayOfWeek().equals(right.getDayOfWeek())) {
                    continue;
                }
                if (timesOverlap(left.getStartTime(), left.getEndTime(),
                        right.getStartTime(), right.getEndTime())) {
                    throw new BadRequestException("Availability windows overlap on the same day");
                }
            }
        }
    }

    private boolean timesOverlap(LocalTime start1, LocalTime end1, LocalTime start2, LocalTime end2) {
        return start1.isBefore(end2) && start2.isBefore(end1);
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
