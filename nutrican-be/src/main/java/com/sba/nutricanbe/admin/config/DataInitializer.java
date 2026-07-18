package com.sba.nutricanbe.admin.config;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import com.sba.nutricanbe.common.entity.SystemSetting;
import com.sba.nutricanbe.common.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Profile("dev")
@Order(2)
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final PtClientMappingRepository ptClientMappingRepository;
    private final PasswordEncoder passwordEncoder;
    private final SystemSettingRepository systemSettingRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.warn("--- BẮT ĐẦU KHỞI TẠO DỮ LIỆU MẪU (TEST DATA) ---");

        if (!systemSettingRepository.existsById("REQUIRE_KYC_FOR_PT")) {
            systemSettingRepository.save(SystemSetting.builder()
                    .key("REQUIRE_KYC_FOR_PT")
                    .value("false")
                    .build());
            log.warn("✅ Initialized REQUIRE_KYC_FOR_PT setting to false");
        }

        // 1. Tạo Admin
        if (!userRepository.existsByEmail("admin@nutrican.com")) {
            User admin = User.builder()
                    .email("admin@nutrican.com")
                    .passwordHash(passwordEncoder.encode("Admin123!")) // Đã sửa thành passwordHash
                    .fullName("System Admin")
                    .role(UserRole.ADMIN)
                    .status(UserStatus.ACTIVE)
                    .build();
            userRepository.save(admin);
            log.warn("✅ Created Admin: admin@nutrican.com / Admin123!");
        }

        // 2. Tạo PT Test
        User ptUser = userRepository.findByEmail("pt@nutrican.com").orElseGet(() -> {
            User pt = User.builder()
                    .email("pt@nutrican.com")
                    .passwordHash(passwordEncoder.encode("Pt12345!")) // Đã sửa thành passwordHash
                    .fullName("Huấn Luyện Viên Test")
                    .role(UserRole.PT_CERTIFIED)
                    .status(UserStatus.ACTIVE)
                    .build();
            pt = userRepository.save(pt);

            // Cấp profile cho PT
            PtProfile ptProfile = PtProfile.builder()
                    .user(pt)
                    .bio("Đây là PT được tạo tự động để test hệ thống.")
                    .experienceStartDate(java.time.LocalDate.of(2019, 1, 1)) // 5+ năm kinh nghiệm
                    .isVerified(true)
                    .build();
            ptProfileRepository.save(ptProfile);
            log.warn("✅ Created PT: pt@nutrican.com / Pt12345!");
            return pt;
        });

        // 3. Tạo Client (Học viên Test)
        User clientUser = userRepository.findByEmail("client@nutrican.com").orElseGet(() -> {
            User client = User.builder()
                    .email("client@nutrican.com")
                    .passwordHash(passwordEncoder.encode("Client123!")) // Đã sửa thành passwordHash
                    .fullName("Học Viên Test")
                    .role(UserRole.CUSTOMER) // Đã sửa thành CUSTOMER
                    .status(UserStatus.ACTIVE)
                    .build();
            client = userRepository.save(client);
            log.warn("✅ Created Client: client@nutrican.com / Client123!");
            return client;
        });

        // 4. Gán Client cho PT (Tạo mối quan hệ để test WebSocket)
        boolean mappingExists = ptClientMappingRepository.existsByPt_IdAndClient_Id(ptUser.getId(), clientUser.getId());
        if (!mappingExists) {
            PtClientMapping mapping = PtClientMapping.builder()
                    .pt(ptUser)
                    .client(clientUser)
                    .status(ClientMappingStatus.ACTIVE)
                    .build();
            ptClientMappingRepository.save(mapping);
            log.warn("✅ Mapped Client [client@nutrican.com] to PT [pt@nutrican.com]");
        }

        log.warn("--- KHỞI TẠO DỮ LIỆU MẪU THÀNH CÔNG ---");
    }
}
