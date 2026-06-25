package com.sba.nutricanbe.user.service;

import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.entity.MacroTarget;
import java.util.Optional;
import java.util.UUID;

public interface UserQueryService {
    Optional<User> findUserById(UUID userId);
    Optional<MacroTarget> findMacroTargetByUserId(UUID userId);
}
