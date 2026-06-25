package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.common.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PtProfileRepository extends JpaRepository<PtProfile, UUID> {

    Optional<PtProfile> findByUserId(UUID userId);

    Page<PtProfile> findByIsVerifiedTrue(Pageable pageable);

    Page<PtProfile> findByIsVerifiedTrueAndTier(Tier tier, Pageable pageable);

    Page<PtProfile> findByPtRequestStatus(UserStatus status, Pageable pageable);

    Page<PtProfile> findByVerificationStatus(UserStatus status, Pageable pageable);

    @Query("SELECT p FROM PtProfile p JOIN FETCH p.user WHERE p.id = :id")
    Optional<PtProfile> findByIdWithUser(@Param("id") UUID id);

    @Query("SELECT p FROM PtProfile p JOIN FETCH p.user u WHERE u.email = :email")
    Optional<PtProfile> findByUserEmail(@Param("email") String email);
}
