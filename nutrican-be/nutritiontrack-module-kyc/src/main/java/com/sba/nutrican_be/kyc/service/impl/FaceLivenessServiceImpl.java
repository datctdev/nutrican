package com.sba.nutrican_be.kyc.service.impl;

import com.sba.nutrican_be.kyc.dto.response.LivenessResponse;
import com.sba.nutrican_be.kyc.service.FaceLivenessService;
import com.sba.nutrican_be.kyc.usecase.VNPTClient;
import com.sba.nutrican_be.kyc.valueObjects.FaceLivenessResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FaceLivenessServiceImpl implements FaceLivenessService {

    private final VNPTClient vnpt;

    @Override
    public FaceLivenessResult verify(String fileHash, String clientSession) {
        LivenessResponse live = vnpt.liveness(fileHash, clientSession);

        String lv = (live != null && live.getObj() != null) ? live.getObj().getLiveness() : null;
        String msg = (live != null && live.getObj() != null) ? live.getObj().getLivenessMsg() : null;

        boolean isLive = "success".equalsIgnoreCase(lv);
        return new FaceLivenessResult(isLive, lv, msg);
    }
}
