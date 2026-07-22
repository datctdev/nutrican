package com.sba.nutricanbe.chat.entity;

import com.sba.nutricanbe.chat.enums.ChatMessageType;
import com.sba.nutricanbe.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class ChatMessage extends BaseEntity {

    @Column(name = "mapping_id", nullable = false)
    private UUID mappingId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    @Builder.Default
    private ChatMessageType messageType = ChatMessageType.TEXT;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "image_object_name", length = 500)
    private String imageObjectName;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "context_type", length = 20)
    private com.sba.nutricanbe.chat.enums.ChatContextType contextType;

    @Column(name = "context_ref_id")
    private UUID contextRefId;

    @Column(name = "attachment_url", length = 1000)
    private String attachmentUrl;

    @Column(name = "attachment_object_name", length = 500)
    private String attachmentObjectName;
}
