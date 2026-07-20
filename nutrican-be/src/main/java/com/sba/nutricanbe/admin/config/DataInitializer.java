package com.sba.nutricanbe.admin.config;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.Review;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.ReviewRepository;
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

import java.math.BigDecimal;

@Slf4j
@Component
@Profile("dev")
@Order(2)
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final PtClientMappingRepository ptClientMappingRepository;
    private final ReviewRepository reviewRepository;
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
                    .passwordHash(passwordEncoder.encode("Admin123!"))
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
                    .passwordHash(passwordEncoder.encode("Pt12345!"))
                    .fullName("Huấn Luyện Viên Test")
                    .role(UserRole.PT_CERTIFIED)
                    .status(UserStatus.ACTIVE)
                    .build();
            pt = userRepository.save(pt);

            PtProfile ptProfile = PtProfile.builder()
                    .user(pt)
                    .bio("Chào bạn, mình là PT chuyên nghiệp với hơn 5 năm kinh nghiệm. Mình tin rằng mọi sự thay đổi đều bắt đầu từ thói quen nhỏ nhất. Hãy để mình đồng hành cùng bạn trên con đường chinh phục vóc dáng trong mơ.")
                    .trainingPhilosophy("Kỷ luật là cầu nối giữa mục tiêu và thành tựu. Tập luyện không chỉ thay đổi cơ thể mà còn rèn giũa ý chí.")
                    .instagramUrl("https://instagram.com/pt.nutrican")
                    .linkedinUrl("https://linkedin.com/in/pt-nutrican")
                    .portfolioShowcase(java.util.Map.of(
                            "coverPhotoUrl", "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop",
                            "transformations", java.util.List.of(
                                    java.util.Map.of(
                                            "id", 1,
                                            "title", "Giảm 15kg mỡ thừa trong 3 tháng",
                                            "story", "Học viên Nguyễn Văn A đã kiên trì theo lịch tập tạ 4 buổi/tuần và chế độ ăn Low-Carb. Kết quả sau 12 tuần thực sự ngoài sức mong đợi. Cơ thể nhẹ nhàng hơn và các chỉ số sức khỏe đều trở về mức tuyệt vời.",
                                            "beforeUrl", "https://placehold.co/600x400/eeeeee/999999?text=Before+Image",
                                            "afterUrl", "https://placehold.co/600x400/d1fae5/065f46?text=After+Image"
                                    )
                            )
                    ))
                    .experienceStartDate(java.time.LocalDate.of(2019, 1, 1))
                    .isVerified(true)
                    .rating(BigDecimal.valueOf(4.8)) // Seed rating
                    .totalReviews(2)
                    .build();
            ptProfileRepository.save(ptProfile);
            log.warn("✅ Created PT: pt@nutrican.com / Pt12345!");
            return pt;
        });

        // 3. Tạo Client (Học viên Test)
        User clientUser = userRepository.findByEmail("client@nutrican.com").orElseGet(() -> {
            User client = User.builder()
                    .email("client@nutrican.com")
                    .passwordHash(passwordEncoder.encode("Client123!"))
                    .fullName("Học Viên Test")
                    .role(UserRole.CUSTOMER)
                    .status(UserStatus.ACTIVE)
                    .build();
            client = userRepository.save(client);
            log.warn("✅ Created Client: client@nutrican.com / Client123!");
            return client;
        });

        // 4. Tạo Thêm Client Khác (Để làm mồi đánh giá)
        User client2 = userRepository.findByEmail("client2@nutrican.com").orElseGet(() -> {
            User client = User.builder()
                    .email("client2@nutrican.com")
                    .passwordHash(passwordEncoder.encode("Client123!"))
                    .fullName("Trần Thị Đánh Giá")
                    .role(UserRole.CUSTOMER)
                    .status(UserStatus.ACTIVE)
                    .build();
            return userRepository.save(client);
        });

        // 5. Gán Client cho PT & Tạo Review Test
        if (!ptClientMappingRepository.existsByPt_IdAndClient_Id(ptUser.getId(), clientUser.getId())) {
            // Client 1: Trạng thái ACTIVE (Đang học, không được review)
            PtClientMapping mapping1 = PtClientMapping.builder()
                    .pt(ptUser).client(clientUser).status(ClientMappingStatus.ACTIVE).build();
            ptClientMappingRepository.save(mapping1);
            log.warn("✅ Mapped Client [client@nutrican.com] to PT [pt@nutrican.com] as ACTIVE");
        }

        if (!ptClientMappingRepository.existsByPt_IdAndClient_Id(ptUser.getId(), client2.getId())) {
            // Client 2: Trạng thái COMPLETED (Đã học xong, được quyền review)
            PtClientMapping mapping2 = PtClientMapping.builder()
                    .pt(ptUser).client(client2).status(ClientMappingStatus.COMPLETED).build();
            ptClientMappingRepository.save(mapping2);
            log.warn("✅ Mapped Client [client2@nutrican.com] to PT [pt@nutrican.com] as COMPLETED");

            // Tạo Review từ Client 2 cho PT Test
            Review review1 = Review.builder()
                    .pt(ptUser)
                    .reviewer(client2)
                    .rating(5.0)
                    .comment("Anh PT hướng dẫn rất tận tình, chế độ ăn sát với thực tế không bị ngán. Kết quả sau 2 tháng mình đã giảm được 5kg. Rất đáng tiền!")
                    .isAnonymous(false)
                    .imageUrl("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop")
                    .build();
            reviewRepository.save(review1);

            Review review2 = Review.builder()
                    .pt(ptUser)
                    .reviewer(clientUser)
                    .rating(4.0)
                    .comment("Bài tập hơi nặng so với người mới, nhưng kết quả thì tuyệt vời.")
                    .isAnonymous(true)
                    .build();
            reviewRepository.save(review2);
            log.info("✅ Created 2 Sample Reviews for PT [pt.certified@gmail.com]");
            ptProfileRepository.findByUserId(ptUser.getId()).ifPresent(profile -> {
                profile.setRating(BigDecimal.valueOf(4.5));
                profile.setTotalReviews(2);
                ptProfileRepository.save(profile);
                log.info("✅ Updated PT Profile Rating to 4.5 and Total Reviews to 2");
            });
        }

        log.info("--- KHỞI TẠO DỮ LIỆU MẪU THÀNH CÔNG ---");
    }
}