package com.sba.nutricanbe.chat.service.impl;

import com.sba.nutricanbe.chat.dto.ChatMessageRequest;
import com.sba.nutricanbe.chat.dto.ChatMessageResponse;
import com.sba.nutricanbe.chat.dto.ChatThreadResponse;
import com.sba.nutricanbe.chat.entity.ChatMessage;
import com.sba.nutricanbe.chat.enums.ChatContextType;
import com.sba.nutricanbe.chat.enums.ChatMessageType;
import com.sba.nutricanbe.chat.repository.ChatMessageRepository;
import com.sba.nutricanbe.chat.service.ChatService;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.infrastructure.storage.StorageService;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.workspace.service.WebSocketSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final PtClientMappingRepository mappingRepository;
    private final UserRepository userRepository;
    private final StorageService storageService;
    private final WebSocketSessionService webSocketSessionService;
    private static final String CHAT_MESSAGE_EVENT = "CHAT_MESSAGE";

    @Override
    public void publishRealtimeMessage(ChatMessageResponse message) {
        webSocketSessionService.sendToUser(message.getSenderId(), CHAT_MESSAGE_EVENT, message);
        if (!message.getSenderId().equals(message.getRecipientId())) {
            webSocketSessionService.sendToUser(message.getRecipientId(), CHAT_MESSAGE_EVENT, message);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<ChatThreadResponse>> getThreads(UUID userId) {
        List<ChatThreadResponse> threads = mappingRepository.findThreadsByUserId(userId).stream()
                .filter(mapping -> mapping.getStatus() == ClientMappingStatus.ACTIVE || mapping.getStatus() == ClientMappingStatus.END_REQUESTED)
                .map(mapping -> toThreadResponse(mapping, userId))
                .sorted(Comparator.comparing(
                        thread -> thread.getLastMessage() != null
                                ? thread.getLastMessage().getCreatedAt()
                                : thread.getLinkedAt(),
                        Comparator.<LocalDateTime>nullsLast(Comparator.reverseOrder())))
                .toList();
        return ApiResponse.success(threads);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<PageResponse<ChatMessageResponse>> getMessages(UUID userId, UUID mappingId, int page, int size) {
        PtClientMapping mapping = getActiveMappingForUser(mappingId, userId);
        return ApiResponse.success(PageResponse.from(chatMessageRepository
                .findByMappingIdWithUsers(mapping.getId(),
                        PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(this::toMessageResponse)));
    }

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(UUID senderId, ChatMessageRequest request) {
        if (request == null || request.getMappingId() == null) {
            throw new BadRequestException("mappingId is required");
        }
        String content = normalizeContent(request.getContent());
        String imageUrl = normalizeImageUrl(request.getImageUrl());
        validateMessagePayload(content, imageUrl);

        PtClientMapping mapping = getActiveMappingForUser(request.getMappingId(), senderId);
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", senderId));
        User recipient = mapping.getPt().getId().equals(senderId) ? mapping.getClient() : mapping.getPt();

        ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                .mapping(mapping)
                .sender(sender)
                .recipient(recipient)
                .content(content != null ? content : "")
                .messageType(imageUrl != null ? ChatMessageType.IMAGE : ChatMessageType.TEXT)
                .imageUrl(imageUrl)
                .contextType(request.getContextType())
                .contextRefId(request.getContextRefId())
                .build());
        return toMessageResponse(message);
    }

    @Override
    @Transactional
    public ChatMessageResponse sendAttachmentMessage(UUID senderId, UUID mappingId, String content,
            MultipartFile file, ChatContextType contextType, UUID contextRefId) {
        if (mappingId == null) {
            throw new BadRequestException("mappingId is required");
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("file is required");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("PDF must be at most 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new BadRequestException("Only PDF attachments are allowed");
        }

        PtClientMapping mapping = getActiveMappingForUser(mappingId, senderId);
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", senderId));
        User recipient = mapping.getPt().getId().equals(senderId) ? mapping.getClient() : mapping.getPt();

        String objectName = storageService.uploadFile(file, "chat-attachments/" + mappingId);
        String attachmentUrl = storageService.getPresignedUrl(objectName);
        String normalizedContent = normalizeContent(content);

        ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                .mapping(mapping)
                .sender(sender)
                .recipient(recipient)
                .content(normalizedContent != null ? normalizedContent : "")
                .messageType(ChatMessageType.FILE)
                .attachmentUrl(attachmentUrl)
                .attachmentObjectName(objectName)
                .contextType(contextType)
                .contextRefId(contextRefId)
                .build());
        return toMessageResponse(message);
    }

    @Override
    @Transactional
    public ChatMessageResponse sendImageMessage(UUID senderId, UUID mappingId, String content, MultipartFile file) {
        if (mappingId == null) {
            throw new BadRequestException("mappingId is required");
        }
        validateImageFile(file);

        PtClientMapping mapping = getActiveMappingForUser(mappingId, senderId);
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", senderId));
        User recipient = mapping.getPt().getId().equals(senderId) ? mapping.getClient() : mapping.getPt();

        String objectName = storageService.uploadFile(file, "chat/" + mappingId);
        String imageUrl = storageService.getPresignedUrl(objectName);
        String normalizedContent = normalizeContent(content);

        ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                .mapping(mapping)
                .sender(sender)
                .recipient(recipient)
                .content(normalizedContent != null ? normalizedContent : "")
                .messageType(ChatMessageType.IMAGE)
                .imageUrl(imageUrl)
                .imageObjectName(objectName)
                .build());
        return toMessageResponse(message);
    }

    @Override
    @Transactional
    public ApiResponse<Void> markRead(UUID userId, UUID mappingId) {
        PtClientMapping mapping = getActiveMappingForUser(mappingId, userId);
        chatMessageRepository.markRead(mapping.getId(), userId, LocalDateTime.now());
        return ApiResponse.success(null, "Messages marked as read");
    }

    private PtClientMapping getActiveMappingForUser(UUID mappingId, UUID userId) {
        PtClientMapping mapping = mappingRepository.findByIdWithUsers(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("PT-client mapping", mappingId));
        if (mapping.getStatus() != ClientMappingStatus.ACTIVE && mapping.getStatus() != ClientMappingStatus.END_REQUESTED) {
            throw new BadRequestException("Chat is available only after the hiring request is accepted");
        }
        if (!mapping.getPt().getId().equals(userId) && !mapping.getClient().getId().equals(userId)) {
            throw new BadRequestException("You are not a participant in this chat");
        }
        return mapping;
    }

    private ChatThreadResponse toThreadResponse(PtClientMapping mapping, UUID userId) {
        User participant = mapping.getPt().getId().equals(userId) ? mapping.getClient() : mapping.getPt();
        ChatMessageResponse lastMessage = chatMessageRepository.findTopByMapping_IdOrderByCreatedAtDesc(mapping.getId())
                .map(this::toMessageResponse)
                .orElse(null);
        return ChatThreadResponse.builder()
                .mappingId(mapping.getId())
                .participantId(participant.getId())
                .participantName(participant.getFullName())
                .participantAvatarUrl(participant.getAvatarUrl())
                .status(mapping.getStatus())
                .lastMessage(lastMessage)
                .unreadCount(chatMessageRepository.countByMapping_IdAndRecipient_IdAndReadAtIsNull(mapping.getId(), userId))
                .linkedAt(mapping.getAssignedAt())
                .endRequestedBy(mapping.getEndRequestedBy() != null ? mapping.getEndRequestedBy().name() : null)
                .build();
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .mappingId(message.getMapping().getId())
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getFullName())
                .senderAvatarUrl(message.getSender().getAvatarUrl())
                .recipientId(message.getRecipient().getId())
                .recipientName(message.getRecipient().getFullName())
                .recipientAvatarUrl(message.getRecipient().getAvatarUrl())
                .content(message.getContent())
                .messageType(message.getMessageType())
                .imageUrl(message.getImageUrl())
                .contextType(message.getContextType())
                .contextRefId(message.getContextRefId())
                .attachmentUrl(message.getAttachmentUrl())
                .readAt(message.getReadAt())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private String normalizeContent(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }
        String normalized = content.trim();
        if (normalized.length() > 2000) {
            throw new BadRequestException("content must be at most 2000 characters");
        }
        return normalized;
    }

    private String normalizeImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        String normalized = imageUrl.trim();
        if (normalized.length() > 1000) {
            throw new BadRequestException("imageUrl must be at most 1000 characters");
        }
        return normalized;
    }

    private void validateMessagePayload(String content, String imageUrl) {
        if (content == null && imageUrl == null) {
            throw new BadRequestException("content or imageUrl is required");
        }
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("image file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File must be an image");
        }
    }
}
