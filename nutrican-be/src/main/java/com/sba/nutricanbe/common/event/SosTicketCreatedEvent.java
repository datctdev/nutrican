package com.sba.nutricanbe.common.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

@Getter
public class SosTicketCreatedEvent extends ApplicationEvent {

    private final UUID ptId;
    private final UUID clientId;
    private final String clientName;
    private final String priority;

    public SosTicketCreatedEvent(Object source, UUID ptId, UUID clientId, String clientName, String priority) {
        super(source);
        this.ptId = ptId;
        this.clientId = clientId;
        this.clientName = clientName;
        this.priority = priority;
    }
}
