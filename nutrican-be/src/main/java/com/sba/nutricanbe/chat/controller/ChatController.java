package com.sba.nutricanbe.chat.controller;

import com.sba.nutricanbe.chat.dto.ChatMessageResponse;
import com.sba.nutricanbe.chat.dto.ChatThreadResponse;
import com.sba.nutricanbe.chat.service.ChatService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping(value = "/threads/{mappingId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendImage(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String content) {
        ChatMessageResponse message = chatService.sendImageMessage(user.getId(), mappingId, content, file);
        chatService.publishRealtimeMessage(message);
        return ResponseEntity.ok(ApiResponse.success(message, "Image message sent"));
    }

    @PostMapping(value = "/threads/{mappingId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendAttachment(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) String contextType,
            @RequestParam(required = false) UUID contextRefId) {
        com.sba.nutricanbe.chat.enums.ChatContextType ctx = contextType != null
                ? com.sba.nutricanbe.chat.enums.ChatContextType.valueOf(contextType) : null;
        ChatMessageResponse message = chatService.sendAttachmentMessage(
                user.getId(), mappingId, content, file, ctx, contextRefId);
        chatService.publishRealtimeMessage(message);
        return ResponseEntity.ok(ApiResponse.success(message, "Attachment sent"));
    }

    @PutMapping("/threads/{mappingId}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.markRead(user.getId(), mappingId));
    }
}
