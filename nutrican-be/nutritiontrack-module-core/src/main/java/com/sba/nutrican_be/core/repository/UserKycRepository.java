package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.UserKyc;
import com.sba.nutrican_be.core.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserKycRepository extends JpaRepository<UserKyc, UUID> {

    Optional<UserKyc> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    boolean existsByIdCardNumber(String idCardNumber);

    Page<UserKyc> findByVerificationStatus(UserStatus status, Pageable pageable);
}
