package com.sba.nutricanbe.kyc.service;



import com.sba.nutricanbe.kyc.valueobject.AttachDecision;

import java.util.UUID;

public interface KycSessionAttachService {

    AttachDecision attachFile(UUID sessionId, UUID userId, String fileHash, String classifyName);
}
