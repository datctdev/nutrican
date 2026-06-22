package com.sba.nutrican_be.infrastructure.redis;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RateLimitingService {

    private final LettuceBasedProxyManager<byte[]> proxyManager;

    public RateLimitingService(RedisClient redisClient) {
        this.proxyManager = LettuceBasedProxyManager.builderFor(redisClient).build();
    }

    public Bucket resolveBucket(String key, int tokens, Duration period) {
        return proxyManager.builder().build(key.getBytes(), () -> BucketConfiguration.builder()
                .addLimit(Bandwidth.builder().capacity(tokens).refillIntervally(tokens, period).build())
                .build());
    }

    public boolean tryConsume(String key, int tokens, Duration period) {
        Bucket bucket = resolveBucket(key, tokens, period);
        return bucket.tryConsume(1);
    }
}
