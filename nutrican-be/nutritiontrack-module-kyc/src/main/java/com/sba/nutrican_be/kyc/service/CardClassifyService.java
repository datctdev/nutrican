package com.sba.nutrican_be.kyc.service;


import com.sba.nutrican_be.kyc.valueObjects.ClassifyResult;

public interface CardClassifyService {

    ClassifyResult classify(String fileHash, String clientSession);
}
