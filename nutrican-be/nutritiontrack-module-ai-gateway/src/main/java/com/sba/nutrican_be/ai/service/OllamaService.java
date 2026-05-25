package com.sba.nutrican_be.ai.service;

public interface OllamaService {

    <T> T post(String endpoint, Object body, Class<T> responseType);

    boolean isAvailable();
}
