package com.sba.nutrican_be.core.repository;

import com.sba.nutrican_be.core.entity.MacroTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MacroTargetRepository extends JpaRepository<MacroTarget, Long> {

    Optional<MacroTarget> findByUserId(Long userId);
}
