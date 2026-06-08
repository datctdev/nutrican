package com.sba.nutrican_be.kyc.service.impl;

import com.sba.nutrican_be.kyc.dto.response.CardLivenessResponse;
import com.sba.nutrican_be.kyc.service.CardLivenessService;
import com.sba.nutrican_be.kyc.usecase.VNPTClient;
import com.sba.nutrican_be.kyc.valueObjects.CardLivenessResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CardLivenessServiceImpl implements CardLivenessService {
    private final VNPTClient vnpt;

    @Override
    public CardLivenessResult verify(String fileHash, String clientSession) {
        CardLivenessResponse live = vnpt.cardLiveness(fileHash, clientSession);

        String lv = (live != null && live.getObject() != null) ? live.getObject().getLiveness() : null;
        String msg = (live != null && live.getObject() != null) ? live.getObject().getLivenessMsg() : null;

        boolean isReal = "success".equalsIgnoreCase(lv);
        return new CardLivenessResult(isReal, lv, msg);
    }
}
