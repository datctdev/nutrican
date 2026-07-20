package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.PtMappingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PtMappingSessionRepository extends JpaRepository<PtMappingSession, UUID> {

    List<PtMappingSession> findByMappingIdOrderBySequenceAsc(UUID mappingId);

    void deleteByMappingId(UUID mappingId);

    long countByMappingId(UUID mappingId);
}
