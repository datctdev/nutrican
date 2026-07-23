package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.common.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleId(String googleId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") UUID id);

    boolean existsByEmail(String email);

    Page<User> findByRole(UserRole role, Pageable pageable);

    Page<User> findByRoleAndStatus(UserRole role, com.sba.nutricanbe.common.enums.UserStatus status, Pageable pageable);

    List<User> findByRoleInAndStatus(
            Collection<UserRole> roles,
            com.sba.nutricanbe.common.enums.UserStatus status);

    Page<User> findByStatus(com.sba.nutricanbe.common.enums.UserStatus status, Pageable pageable);

    @Query("SELECT u FROM User u WHERE LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<User> findBySearch(@Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.ptProfile WHERE u.id = :id")
    Optional<User> findByIdWithPtProfile(@Param("id") UUID id);
}
