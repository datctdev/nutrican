package com.sba.nutrican_be.kyc.service;



import com.sba.nutrican_be.kyc.valueObjects.AttachDecision;

import java.util.UUID;

public interface KycSessionAttachService {

    AttachDecision attachFile(UUID sessionId, UUID userId, String fileHash, String classifyName);
}
