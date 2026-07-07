package com.sba.nutricanbe.user.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class OnboardingStatusDto {
    private boolean completed;
    private boolean forceRedirect;
    private boolean showBanner;
    private int step;
    private boolean hasMacroTarget;
    private List<String> missingFields;
}
