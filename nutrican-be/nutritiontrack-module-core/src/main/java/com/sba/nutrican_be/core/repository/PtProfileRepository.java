package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.PtProfile;
import com.sba.nutrican_be.core.enums.Tier;
import com.sba.nutrican_be.core.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PtProfileRepository extends JpaRepository<PtProfile, Long> {

    Optional<PtProfile> findByUserId(Long userId);

    Page<PtProfile> findByIsVerifiedTrue(Pageable pageable);

    Page<PtProfile> findByIsVerifiedTrueAndTier(Tier tier, Pageable pageable);

    Page<PtProfile> findByVerificationStatus(UserStatus status, Pageable pageable);

    @Query("SELECT p FROM PtProfile p JOIN FETCH p.user WHERE p.id = :id")
    Optional<PtProfile> findByIdWithUser(@Param("id") Long id);

    @Query("SELECT p FROM PtProfile p JOIN FETCH p.user u WHERE u.email = :email")
    Optional<PtProfile> findByUserEmail(@Param("email") String email);
}
