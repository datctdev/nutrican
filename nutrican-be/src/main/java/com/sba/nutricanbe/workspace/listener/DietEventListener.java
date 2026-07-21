package com.sba.nutricanbe.workspace.listener;

import com.sba.nutricanbe.common.event.DietLogCreatedEvent;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DietEventListener {

    private final WebSocketSessionService webSocketSessionService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleDietLogCreatedEvent(DietLogCreatedEvent event) {
        log.info("Pushing new DietLog notification to PT: {}", event.getPtId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("logId", event.getLogId());
        payload.put("clientId", event.getClientId());
        payload.put("clientName", event.getClientName());
        payload.put("mealType", event.getMealType());

        webSocketSessionService.notifyPtOfNewDietLog(event.getPtId(), payload);
    }
}
