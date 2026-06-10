package com.sba.nutrican_be.workspace.listener;

import com.sba.nutrican_be.core.event.DietLogCreatedEvent;
import com.sba.nutrican_be.core.event.SosTicketCreatedEvent;
import com.sba.nutrican_be.workspace.service.SseEmitterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DietEventListener {

    private final SseEmitterService sseEmitterService;

    @EventListener
    public void onDietLogCreated(DietLogCreatedEvent event) {
        if (event.getPtId() == null) {
            return;
        }
        sseEmitterService.notifyPtOfNewDietLog(
                event.getPtId(),
                event.getClientId(),
                event.getClientName(),
                event.getLogId(),
                event.getMealType()
        );
    }

    @EventListener
    public void onSosTicketCreated(SosTicketCreatedEvent event) {
        if (event.getPtId() == null) {
            return;
        }
        sseEmitterService.broadcastSos(
                event.getPtId(),
                event.getClientId(),
                event.getClientName(),
                event.getPriority()
        );
    }
}
