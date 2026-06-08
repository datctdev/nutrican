package com.sba.nutrican_be.kyc.service;


import com.sba.nutrican_be.kyc.valueObjects.FaceLivenessResult;

public interface FaceLivenessService {
    FaceLivenessResult verify(String fileHash, String clientSession);
}
