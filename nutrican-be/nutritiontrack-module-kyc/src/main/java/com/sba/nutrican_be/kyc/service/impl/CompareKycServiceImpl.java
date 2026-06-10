package com.sba.nutrican_be.kyc.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.repository.UserRepository;
import com.sba.nutrican_be.kyc.dto.response.CompareResponse;
import com.sba.nutrican_be.kyc.entity.EKycSession;
import com.sba.nutrican_be.kyc.repository.KycSessionRepository;
import com.sba.nutrican_be.kyc.service.CompareKycService;
import com.sba.nutrican_be.kyc.usecase.VNPTClient;
import com.sba.nutrican_be.kyc.valueObjects.KycStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompareKycServiceImpl implements CompareKycService {

    private final KycSessionRepository sessions;
    private final VNPTClient vnpt;
    private final UserRepository userRepository;
    private final ObjectMapper om;

    public Map<String, Object> compare(UUID sessionId, UUID accountId) {
        EKycSession s = get(sessionId, accountId);

        if (s.getFrontHash() == null || s.getFrontHash().isBlank()) {
            throw new IllegalStateException("Front not uploaded");
        }
        if (s.getSelfieHash() == null || s.getSelfieHash().isBlank()) {
            throw new IllegalStateException("Selfie not uploaded");
        }

        CompareResponse res = vnpt.compare(s.getFrontHash(), s.getSelfieHash(), sessionId.toString());
        CompareResponse.Obj o = res.getObj();

        String msg = (o != null ? o.getMsg() : null);
        Double prob = (o != null && o.getProb() != null) ? o.getProb() : 0.0;

        boolean matched = msg != null && msg.equalsIgnoreCase("MATCH");
        boolean passed = matched && prob >= 95.0;

        s.setStatus(passed ? KycStatus.VERIFIED : KycStatus.REJECTED);
        // lưu trace tối giản để debug
        s.setProviderTrace(toJsonSafe(res));
        sessions.save(s);

        if (passed) {
            User user = userRepository.findById(accountId)
                    .orElseThrow(() -> new IllegalStateException("No account found"));
            user.setIsKycVerified(true);
            userRepository.save(user);
        }

        Map<String, Object> out = new HashMap<>();
        out.put("isMatch", matched);
        out.put("matchScore", prob);
        out.put("status", s.getStatus().name());
        out.put("verifiedAt", passed ? s.getUpdatedAt() : null);
        return out;
    }

    public EKycSession get(UUID sessionId, UUID userId) {
        return sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException(sessionId.toString() + userId.toString()));
    }

    private String toJsonSafe(Object obj) {
        try {
            return om.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.warn("Cannot serialize VNPT response to JSON. {}", e.getMessage());
            return null;
        }
    }
}
