package com.sba.nutrican_be.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

@Getter
public class DietLogCreatedEvent extends ApplicationEvent {

    private final UUID ptId;
    private final UUID clientId;
    private final String clientName;
    private final UUID logId;
    private final String mealType;

    public DietLogCreatedEvent(Object source, UUID ptId, UUID clientId, String clientName, UUID logId, String mealType) {
        super(source);
        this.ptId = ptId;
        this.clientId = clientId;
        this.clientName = clientName;
        this.logId = logId;
        this.mealType = mealType;
    }
}
