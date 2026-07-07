package com.sba.nutricanbe.ai.dto;

import com.sba.nutricanbe.diet.enums.FoodGateResult;

public record FoodGatePreCheckResult(FoodGateResult gateResult, ResNetAnalyzeResponse resNetResponse) {
}
