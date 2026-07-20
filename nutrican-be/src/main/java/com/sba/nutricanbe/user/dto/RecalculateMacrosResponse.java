package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.ActivityLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecalculateMacrosResponse {
    private ActivityLevel activityLevel;
    private MacroSuggestionResponse macros;
}
