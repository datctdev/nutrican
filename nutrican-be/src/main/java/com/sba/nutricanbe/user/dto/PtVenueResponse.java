package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.entity.PtVenue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtVenueResponse {

    private UUID id;
    private String name;
    private String address;
    private String mapsUrl;
    private String note;
    private Boolean active;

    public static PtVenueResponse from(PtVenue venue) {
        return PtVenueResponse.builder()
                .id(venue.getId())
                .name(venue.getName())
                .address(venue.getAddress())
                .mapsUrl(venue.getMapsUrl())
                .note(venue.getNote())
                .active(venue.getActive())
                .build();
    }
}
