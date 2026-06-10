package com.sba.nutrican_be.kyc.service;


import com.sba.nutrican_be.kyc.valueObjects.CardLivenessResult;

public interface CardLivenessService {
    CardLivenessResult verify(String fileHash, String clientSession);
}
