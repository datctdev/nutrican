package com.sba.nutricanbe.chat.service.impl;

import com.sba.nutricanbe.chat.dto.ChatMessageRequest;
import com.sba.nutricanbe.chat.dto.ChatMessageResponse;
import com.sba.nutricanbe.chat.dto.ChatThreadResponse;
import com.sba.nutricanbe.chat.entity.ChatMessage;
import com.sba.nutricanbe.chat.repository.ChatMessageRepository;
import com.sba.nutricanbe.chat.service.ChatService;
import com.sba.nutricanbe.common.dto.ApiResponse;
import com.sba.nutricanbe.common.dto.PageResponse;
import com.sba.nutricanbe.common.exception.BadRequestException;
import com.sba.nutricanbe.common.exception.ResourceNotFoundException;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Override
    @Transactional(readOnly = true)
    public ApiResponse<List<ChatThreadResponse>> getThreads(UUID userId) {
        List<ChatThreadResponse> threads = mappingRepository.findThreadsByUserId(userId).stream()
                .filter(mapping -> mapping.getStatus() == ClientMappingStatus.ACTIVE)
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
        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new BadRequestException("content is required");
        }
        if (request.getContent().length() > 2000) {
            throw new BadRequestException("content must be at most 2000 characters");
        }

        PtClientMapping mapping = getActiveMappingForUser(request.getMappingId(), senderId);
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User", senderId));
        User recipient = mapping.getPt().getId().equals(senderId) ? mapping.getClient() : mapping.getPt();

        ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                .mapping(mapping)
                .sender(sender)
                .recipient(recipient)
                .content(request.getContent().trim())
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
        if (mapping.getStatus() != ClientMappingStatus.ACTIVE) {
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
                .readAt(message.getReadAt())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
