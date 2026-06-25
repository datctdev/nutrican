package com.sba.nutricanbe.kyc.valueObjects;

public record FaceLivenessResult(boolean isLive,
                                 String liveness,
                                 String livenessMsg) {
}
