package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.service.UserQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserQueryServiceImpl implements UserQueryService {

    private final UserRepository userRepository;
    private final MacroTargetRepository macroTargetRepository;

    @Override
    public Optional<User> findUserById(UUID userId) {
        return userRepository.findById(userId);
    }

    @Override
    public Optional<MacroTarget> findMacroTargetByUserId(UUID userId) {
        return macroTargetRepository.findByUserId(userId);
    }
}
