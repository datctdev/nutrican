package com.sba.nutrican_be.infrastructure.service;

import io.github.bucket4j.Bucket;
import java.time.Duration;

public interface RateLimitingService {
    Bucket resolveBucket(String key, int tokens, Duration period);
    boolean tryConsume(String key, int tokens, Duration period);
}
