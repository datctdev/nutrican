package com.sba.nutricanbe.kyc.service;


import com.sba.nutricanbe.kyc.valueObjects.CardLivenessResult;

public interface CardLivenessService {
    CardLivenessResult verify(String fileHash, String clientSession);
}
