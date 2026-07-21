package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.dto.AllergyProfileRequest;
import com.sba.nutricanbe.user.dto.MacroSuggestionQuery;
import com.sba.nutricanbe.user.dto.MacroSuggestionResponse;
import com.sba.nutricanbe.user.dto.RecalculateMacrosRequest;
import com.sba.nutricanbe.user.dto.RecalculateMacrosResponse;
import com.sba.nutricanbe.user.dto.UserPreferencesRequest;

import java.util.UUID;

public interface ProfileExtensionsService {

    String getAllergies(UUID userId);

    String updateAllergies(UUID userId, AllergyProfileRequest request);

    void updatePreferences(UUID userId, UserPreferencesRequest request);

    MacroSuggestionResponse suggestMacros(UUID userId, MacroSuggestionQuery query);

    RecalculateMacrosResponse recalculateMacros(UUID userId, RecalculateMacrosRequest request);

    boolean hasActivePt(UUID userId);
}
