package com.sba.nutricanbe.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PtVenueRequest {

    @NotBlank(message = "Venue name is required")
    @Size(max = 120)
    private String name;

    @NotBlank(message = "Venue address is required")
    @Size(max = 500)
    private String address;

    @Size(max = 500)
    private String mapsUrl;

    private String note;
}
