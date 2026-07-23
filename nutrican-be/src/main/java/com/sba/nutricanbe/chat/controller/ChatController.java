package com.sba.nutricanbe.chat.controller;

import com.sba.nutricanbe.chat.dto.ChatMessageResponse;
import com.sba.nutricanbe.chat.dto.ChatNotificationPreferenceResponse;
import com.sba.nutricanbe.chat.dto.ChatThreadResponse;
import com.sba.nutricanbe.chat.dto.UpdateChatMessageRequest;
import com.sba.nutricanbe.chat.dto.UpdateChatNotificationPreferenceRequest;
import com.sba.nutricanbe.chat.service.ChatService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.user.entity.User;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
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
        return ResponseEntity.ok(ApiResponse.success(
                chatService.sendImageMessage(user.getId(), mappingId, content, file), "Image message sent"));
    }

    @PostMapping(value = "/threads/{mappingId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendAttachment(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) String contextType,
            @RequestParam(required = false) UUID contextRefId) {
        return ResponseEntity.ok(ApiResponse.success(
                chatService.sendAttachmentMessage(
                        user.getId(), mappingId, content, file, contextType, contextRefId),
                "Attachment sent"));
    }

    @PutMapping("/threads/{mappingId}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.markRead(user.getId(), mappingId));
    }

    @GetMapping("/threads/{mappingId}/notification-preference")
    public ResponseEntity<ApiResponse<ChatNotificationPreferenceResponse>> getNotificationPreference(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getNotificationPreference(user.getId(), mappingId));
    }

    @PutMapping("/threads/{mappingId}/notification-preference")
    public ResponseEntity<ApiResponse<ChatNotificationPreferenceResponse>> updateNotificationPreference(
            @PathVariable UUID mappingId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateChatNotificationPreferenceRequest request) {
        return ResponseEntity.ok(chatService.updateNotificationPreference(user.getId(), mappingId, request));
    }

    @PatchMapping("/threads/{mappingId}/messages/{messageId}")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> updateMessage(
            @PathVariable UUID mappingId,
            @PathVariable UUID messageId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateChatMessageRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                chatService.updateMessage(user.getId(), mappingId, messageId, request),
                "Đã sửa tin nhắn"));
    }

    @DeleteMapping("/threads/{mappingId}/messages/{messageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(
            @PathVariable UUID mappingId,
            @PathVariable UUID messageId,
            @AuthenticationPrincipal User user) {
        chatService.deleteMessage(user.getId(), mappingId, messageId);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa tin nhắn"));
    }
}
