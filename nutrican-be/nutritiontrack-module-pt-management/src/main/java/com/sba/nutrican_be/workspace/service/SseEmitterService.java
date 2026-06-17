package com.sba.nutrican_be.workspace.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class SseEmitterService {

    private static final long SSE_TIMEOUT = 60_000L;

    private final Map<UUID, CopyOnWriteArrayList<SseEmitter>> userEmitters = new ConcurrentHashMap<>();

    public SseEmitter createEmitter(UUID userId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        CopyOnWriteArrayList<SseEmitter> emitters = userEmitters
                .computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>());
        emitters.add(emitter);

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError(e -> removeEmitter(userId, emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("{\"status\":\"connected\"}"));
        } catch (IOException e) {
            log.error("Failed to send initial SSE event", e);
        }

        log.info("SSE emitter created for user: {}", userId);
        return emitter;
    }

    public void sendToUser(UUID userId, String eventName, Object data) {
        CopyOnWriteArrayList<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters == null || emitters.isEmpty()) {
            log.debug("No SSE emitters for user: {}", userId);
            return;
        }

        String jsonData;
        if (data instanceof String) {
            jsonData = (String) data;
        } else {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                mapper.findAndRegisterModules();
                jsonData = mapper.writeValueAsString(data);
            } catch (Exception e) {
                jsonData = data.toString();
            }
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(jsonData));
            } catch (IOException e) {
                removeEmitter(userId, emitter);
            }
        }
    }

    public void notifyPtOfNewDietLog(UUID ptId, UUID clientId, String clientName, UUID logId, String mealType) {
        String data = String.format(
                "{\"client_id\":\"%s\",\"client_name\":\"%s\",\"log_id\":\"%s\",\"message\":\"%s logged %s\",\"status_color\":\"RED\"}",
                clientId, clientName, logId, clientName, mealType != null ? mealType.toLowerCase() : "meal"
        );
        sendToUser(ptId, "NEW_DIET_LOG", data);
        log.info("SSE notification sent to PT: {} for client: {} new log", ptId, clientId);
    }

    private void removeEmitter(UUID userId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> emitters = userEmitters.get(userId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                userEmitters.remove(userId);
            }
        }
        log.debug("SSE emitter removed for user: {}", userId);
    }

    public void broadcastSos(UUID ptId, UUID clientId, String clientName, String priority) {
        String data = String.format(
                "{\"client_id\":\"%s\",\"client_name\":\"%s\",\"priority\":\"%s\",\"type\":\"SOS\"}",
                clientId, clientName, priority
        );
        sendToUser(ptId, "SOS_TICKET", data);
    }
}
