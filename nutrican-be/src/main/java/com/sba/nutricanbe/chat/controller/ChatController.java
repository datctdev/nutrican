package com.sba.nutricanbe.chat.controller;

import com.sba.nutricanbe.chat.dto.ChatMessageResponse;
import com.sba.nutricanbe.chat.dto.ChatThreadResponse;
import com.sba.nutricanbe.chat.service.ChatService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/threads")
    public ResponseEntity<ApiResponse<List<ChatThreadResponse>>> getThreads(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getThreads(user.getId()));
    }

    @GetMapping("/threads/{mappingId}/messages")
    public ResponseEntity<ApiResponse<PageResponse<ChatMessageResponse>>> getMessages(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(chatService.getMessages(user.getId(), mappingId, page, size));
    }

    @PutMapping("/threads/{mappingId}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.markRead(user.getId(), mappingId));
    }
}
