package com.sba.nutricanbe.kyc.valueobject;

public record FaceLivenessResult(boolean isLive,
                                 String liveness,
                                 String livenessMsg) {
}
