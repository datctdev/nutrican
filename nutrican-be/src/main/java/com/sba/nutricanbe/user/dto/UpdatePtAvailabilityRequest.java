package com.sba.nutricanbe.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class UpdatePtAvailabilityRequest {

    @NotNull
    @Valid
    private List<PtAvailabilityWindowRequest> windows;
}
