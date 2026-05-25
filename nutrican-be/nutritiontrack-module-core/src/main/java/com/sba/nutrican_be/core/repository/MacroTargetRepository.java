package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.MacroTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MacroTargetRepository extends JpaRepository<MacroTarget, UUID> {

    Optional<MacroTarget> findByUserId(UUID userId);
}
