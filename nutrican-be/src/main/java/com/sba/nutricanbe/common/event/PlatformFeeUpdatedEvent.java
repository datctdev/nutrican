package com.sba.nutricanbe.common.event;

import java.math.BigDecimal;

public record PlatformFeeUpdatedEvent(BigDecimal previousRate, BigDecimal newRate) {
}
