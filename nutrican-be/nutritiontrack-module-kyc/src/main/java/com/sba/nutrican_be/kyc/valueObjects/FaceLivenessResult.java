package com.sba.nutrican_be.kyc.valueObjects;

public record FaceLivenessResult(boolean isLive,
                                 String liveness,
                                 String livenessMsg) {
}
