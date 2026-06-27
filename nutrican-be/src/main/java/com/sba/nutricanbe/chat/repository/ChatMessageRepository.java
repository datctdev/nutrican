package com.sba.nutricanbe.chat.repository;

import com.sba.nutricanbe.chat.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @Query(value = """
            SELECT m FROM ChatMessage m
            JOIN FETCH m.sender
            JOIN FETCH m.recipient
            WHERE m.mapping.id = :mappingId
            ORDER BY m.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(m) FROM ChatMessage m
            WHERE m.mapping.id = :mappingId
            """)
    Page<ChatMessage> findByMappingIdWithUsers(@Param("mappingId") UUID mappingId, Pageable pageable);

    Optional<ChatMessage> findTopByMapping_IdOrderByCreatedAtDesc(UUID mappingId);

    @Modifying
    @Query("""
            UPDATE ChatMessage m
            SET m.readAt = :readAt
            WHERE m.mapping.id = :mappingId
              AND m.recipient.id = :userId
              AND m.readAt IS NULL
            """)
    int markRead(@Param("mappingId") UUID mappingId, @Param("userId") UUID userId, @Param("readAt") LocalDateTime readAt);

    long countByMapping_IdAndRecipient_IdAndReadAtIsNull(UUID mappingId, UUID recipientId);
}
