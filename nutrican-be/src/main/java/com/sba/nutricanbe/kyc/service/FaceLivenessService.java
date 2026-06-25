package com.sba.nutricanbe.kyc.service;


import com.sba.nutricanbe.kyc.valueobject.FaceLivenessResult;

public interface FaceLivenessService {
    FaceLivenessResult verify(String fileHash, String clientSession);
}
