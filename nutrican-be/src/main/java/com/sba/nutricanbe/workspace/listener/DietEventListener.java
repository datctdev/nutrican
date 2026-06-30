package com.sba.nutricanbe.workspace.listener;

import com.sba.nutricanbe.common.event.DietLogCreatedEvent;
import com.sba.nutricanbe.common.event.SosTicketCreatedEvent;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

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

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSosTicketCreatedEvent(SosTicketCreatedEvent event) {
        log.info("Pushing SOS notification to PT: {}", event.getPtId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("logId", UUID.randomUUID().toString());
        payload.put("clientId", event.getClientId());
        payload.put("clientName", event.getClientName());
        payload.put("priority", event.getPriority());

        webSocketSessionService.broadcastSos(event.getPtId(), payload);
    }
}