package com.sba.nutricanbe.chat.service;

import com.sba.nutricanbe.chat.dto.ChatMessageRequest;
import com.sba.nutricanbe.chat.dto.ChatMessageResponse;
import com.sba.nutricanbe.chat.dto.ChatThreadResponse;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;

import java.util.List;
import java.util.UUID;

public interface ChatService {
    ApiResponse<List<ChatThreadResponse>> getThreads(UUID userId);

    ApiResponse<PageResponse<ChatMessageResponse>> getMessages(UUID userId, UUID mappingId, int page, int size);

    ChatMessageResponse sendMessage(UUID senderId, ChatMessageRequest request);

    ApiResponse<Void> markRead(UUID userId, UUID mappingId);
}
