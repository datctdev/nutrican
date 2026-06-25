package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.common.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleId(String googleId);

    boolean existsByEmail(String email);

    Page<User> findByRole(UserRole role, Pageable pageable);

    Page<User> findByRoleAndStatus(UserRole role, com.sba.nutricanbe.common.enums.UserStatus status, Pageable pageable);

    Page<User> findByStatus(com.sba.nutricanbe.common.enums.UserStatus status, Pageable pageable);

    @Query("SELECT u FROM User u WHERE LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<User> findBySearch(@Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.ptProfile WHERE u.id = :id")
    Optional<User> findByIdWithPtProfile(@Param("id") UUID id);
}
