package com.sba.nutricanbe.kyc.service;


import com.sba.nutricanbe.kyc.valueObjects.ClassifyResult;

public interface CardClassifyService {

    ClassifyResult classify(String fileHash, String clientSession);
}
