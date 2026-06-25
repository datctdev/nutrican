package com.sba.nutricanbe.kyc.service;


import com.sba.nutricanbe.kyc.valueobject.CardLivenessResult;

public interface CardLivenessService {
    CardLivenessResult verify(String fileHash, String clientSession);
}
