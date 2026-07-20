package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.user.dto.PtAvailabilityWindowRequest;
import com.sba.nutricanbe.user.dto.PtAvailabilityWindowResponse;
import com.sba.nutricanbe.user.dto.PtVenueRequest;
import com.sba.nutricanbe.user.dto.PtVenueResponse;
import com.sba.nutricanbe.user.dto.UpdatePtAvailabilityRequest;
import com.sba.nutricanbe.user.entity.PtProfile;

import java.util.List;
import java.util.UUID;

public interface PtVenueAvailabilityService {

    ApiResponse<List<PtVenueResponse>> listVenues(UUID ptUserId);

    ApiResponse<PtVenueResponse> createVenue(UUID ptUserId, PtVenueRequest request);

    ApiResponse<PtVenueResponse> updateVenue(UUID ptUserId, UUID venueId, PtVenueRequest request);

    ApiResponse<PtVenueResponse> deactivateVenue(UUID ptUserId, UUID venueId);

    ApiResponse<List<PtAvailabilityWindowResponse>> getAvailability(UUID ptUserId);

    ApiResponse<List<PtAvailabilityWindowResponse>> replaceAvailability(
            UUID ptUserId, UpdatePtAvailabilityRequest request);

    List<PtVenueResponse> listActiveVenuesForProfile(UUID ptProfileId);

    List<PtAvailabilityWindowResponse> listAvailabilityForProfile(UUID ptProfileId);

    void setupOfflineScheduleFromRegistration(
            PtProfile profile,
            List<PtVenueRequest> venues,
            List<PtAvailabilityWindowRequest> windows,
            String offlineRateUnit);
}
