package com.sba.nutrican_be.admin.config;

import com.sba.nutrican_be.core.entity.User;
import com.sba.nutrican_be.core.enums.UserRole;
import com.sba.nutrican_be.core.enums.UserStatus;
import com.sba.nutrican_be.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("admin@nutrican.com")) {
            User admin = User.builder()
                    .email("admin@nutrican.com")
                    .passwordHash(passwordEncoder.encode("Admin123!"))
                    .fullName("System Administrator")
                    .role(UserRole.ADMIN)
                    .status(UserStatus.ACTIVE)
                    .build();
            userRepository.save(admin);
            log.info("Default admin user created: admin@nutrican.com / Admin123!");
        }
    }
}
