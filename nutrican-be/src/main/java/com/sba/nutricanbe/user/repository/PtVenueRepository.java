package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.PtVenue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PtVenueRepository extends JpaRepository<PtVenue, UUID> {

    List<PtVenue> findByPtProfile_IdOrderByCreatedAtAsc(UUID ptProfileId);

    List<PtVenue> findByPtProfile_IdAndActiveTrueOrderByCreatedAtAsc(UUID ptProfileId);

    Optional<PtVenue> findByIdAndPtProfile_Id(UUID id, UUID ptProfileId);

    long countByPtProfile_IdAndActiveTrue(UUID ptProfileId);

    void deleteByPtProfile_Id(UUID ptProfileId);
}
