package com.sba.nutricanbe.kyc.service.impl;


import com.sba.nutricanbe.kyc.dto.response.ClassifyResponse;
import com.sba.nutricanbe.kyc.service.CardClassifyService;
import com.sba.nutricanbe.kyc.client.VnptClient;
import com.sba.nutricanbe.kyc.valueobject.ClassifyResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CardClassifyServiceImpl implements CardClassifyService {
    private final VnptClient vnpt;

    @Override
    public ClassifyResult classify(String fileHash, String clientSession) {
        ClassifyResponse cls = vnpt.classify(fileHash, clientSession);

        String name = (cls != null && cls.getObj() != null) ? cls.getObj().getName() : null;
        Integer type = (cls != null && cls.getObj() != null) ? cls.getObj().getType() : null;
        Double conf = (cls != null && cls.getObj() != null) ? cls.getObj().getConfidence() : null;

        return new ClassifyResult(name, type, conf);
    }
}
