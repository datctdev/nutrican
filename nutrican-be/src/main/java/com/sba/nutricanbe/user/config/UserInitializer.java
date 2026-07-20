package com.sba.nutricanbe.user.config;

import com.sba.nutricanbe.common.enums.RequestStatus;
import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.dto.CertificationData;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.PtUpdateRequest;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.Gender;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.PtUpdateRequestRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class UserInitializer implements CommandLineRunner {

    private static final String DEFAULT_PASSWORD = "123456";

    private final UserRepository userRepository;
    private final PtProfileRepository ptProfileRepository;
    private final PtClientMappingRepository ptClientMappingRepository;
    private final MacroTargetRepository macroTargetRepository;
    private final PtUpdateRequestRepository ptUpdateRequestRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // 1. Tạo Customer
        User customerOne = seedUser(
                "customer1@gmail.com", DEFAULT_PASSWORD, "Nguyen Van Customer",
                UserRole.CUSTOMER, "0901000001", "12 Nguyen Trai, Quan 1, TP.HCM", LocalDate.of(1998, 3, 12));

        User customerTwo = seedUser(
                "customer2@gmail.com", DEFAULT_PASSWORD, "Tran Thi Hoc Vien",
                UserRole.CUSTOMER, "0901000002", "45 Le Loi, Quan 3, TP.HCM", LocalDate.of(2000, 8, 20));

        // 2. Tạo PT
        User certifiedPt = seedUser(
                "pt.certified@gmail.com", DEFAULT_PASSWORD, "Le Minh PT Certified",
                UserRole.PT_CERTIFIED, "0902000001", "Fitness Hub, Quan 7, TP.HCM", LocalDate.of(1992, 5, 6));

        User freelancePt = seedUser(
                "pt.freelance@gmail.com", DEFAULT_PASSWORD, "Pham Anh PT Freelance",
                UserRole.PT_FREELANCE, "0902000002", "Online Coaching, TP.HCM", LocalDate.of(1990, 11, 18));

        // 3. Seed Full Data cho PT 1 (Chuyên nghiệp)
        seedFullPtProfile(
                certifiedPt,
                "Chào bạn, mình là PT chuyên nghiệp với hơn 5 năm kinh nghiệm. Mình tin rằng mọi sự thay đổi đều bắt đầu từ thói quen nhỏ nhất. Việc kết hợp giữa dinh dưỡng khoa học và tập luyện bài bản sẽ mang lại kết quả bền vững.",
                "Kỷ luật là cầu nối giữa mục tiêu và thành tựu. Tập luyện không chỉ thay đổi cơ thể mà còn rèn giũa ý chí.",
                LocalDate.of(2016, 3, 1),
                Gender.MALE,
                "0902000001",
                TrainingMode.BOTH,
                "TP. Hồ Chí Minh",
                BigDecimal.valueOf(450000),
                "SESSION_60",
                List.of("Giảm cân", "Tăng cơ", "Thể hình"),
                List.of("WEIGHT_LOSS", "MUSCLE_GAIN"),
                List.of("NORMAL", "EAT_CLEAN"),
                List.of(
                        CertificationData.builder().name("NASM Certified Personal Trainer").issuingOrganization("NASM").issueDate("2018-05").neverExpires(false).expiryDate("2028-05").certificateImageUrl("https://placehold.co/600x400/e2e8f0/64748b?text=NASM+Certificate").build(),
                        CertificationData.builder().name("Nutrition Specialist").issuingOrganization("Precision Nutrition").issueDate("2019-08").neverExpires(true).certificateImageUrl("https://placehold.co/600x400/e2e8f0/64748b?text=Nutrition+Certificate").build()
                )
        );

        // 4. Seed Full Data cho PT 2 (Tự do)
        seedFullPtProfile(
                freelancePt,
                "Freelance PT chuyên hướng dẫn lịch tập tại nhà và chế độ ăn dành cho người bận rộn. Phương pháp của mình tập trung vào tính thực tế, linh hoạt nhưng vẫn đảm bảo hiệu quả.",
                "Tập luyện phải là niềm vui, không phải là gánh nặng. Chậm mà chắc luôn tốt hơn nhanh mà bỏ cuộc.",
                LocalDate.of(2019, 6, 1),
                Gender.FEMALE,
                "0902000002",
                TrainingMode.ONLINE,
                "Hà Nội",
                BigDecimal.valueOf(1500000),
                "MONTH",
                List.of("Yoga", "Pilates", "Giảm cân"),
                List.of("WEIGHT_LOSS", "MAINTAIN"),
                List.of("VEGAN", "KETO"),
                List.of(
                        CertificationData.builder().name("200H Yoga Teacher Training").issuingOrganization("Yoga Alliance").issueDate("2020-01").neverExpires(true).certificateImageUrl("https://placehold.co/600x400/e2e8f0/64748b?text=Yoga+Certificate").build()
                )
        );

        // 5. Tạo dữ liệu giả lập cho Yêu cầu Cập nhật (Update Request)
        if (!ptUpdateRequestRepository.existsByPtIdAndStatus(certifiedPt.getId(), RequestStatus.PENDING)) {
            PtUpdateRequest updateReq = PtUpdateRequest.builder()
                    .pt(certifiedPt)
                    .requestedData(Map.of(
                            "bio", "Bản cập nhật bio mới: Mình vừa thi đậu thêm chứng chỉ NASM cấp cao quốc tế.",
                            "trainingMode", "HYBRID",
                            "contactPhone", "0988123456",
                            "hourlyRate", 500000,
                            "rateUnit", "SESSION_90"
                    ))
                    .reason("Tôi muốn cập nhật lại SĐT liên hệ mới và tăng nhẹ mức phí dịch vụ cho các buổi tập 90 phút.")
                    .status(RequestStatus.PENDING)
                    .build();
            ptUpdateRequestRepository.save(updateReq);
            log.info("✅ Seeded PENDING PtUpdateRequest for: {}", certifiedPt.getEmail());
        }

        // 6. Seed Mappings & Macro Targets
        seedMapping(certifiedPt, customerOne, ClientMappingStatus.ACTIVE);
        seedMapping(freelancePt, customerTwo, ClientMappingStatus.PENDING);

        seedCustomerE2eProfile(customerOne, NutritionGoal.WEIGHT_LOSS, 170, "MALE");
        seedCustomerE2eProfile(customerTwo, NutritionGoal.WEIGHT_LOSS, 165, "FEMALE");
        seedMacroTarget(customerOne, 2000, 120, 220, 65);
        seedMacroTarget(customerTwo, 1900, 110, 200, 60);

        log.info("✅ Seeded full data for users: {}, {}, {}, {}",
                customerOne.getEmail(), customerTwo.getEmail(), certifiedPt.getEmail(), freelancePt.getEmail());
    }

    private User seedUser(String email, String rawPassword, String fullName, UserRole role, String phone, String address, LocalDate dateOfBirth) {
        return userRepository.findByEmail(email)
                .map(existing -> {
                    boolean changed = false;
                    existing.setPasswordHash(passwordEncoder.encode(rawPassword));
                    changed = true;
                    if (existing.getRole() != role) {
                        existing.setRole(role);
                        changed = true;
                    }
                    if (existing.getStatus() != UserStatus.ACTIVE) {
                        existing.setStatus(UserStatus.ACTIVE);
                        changed = true;
                    }
                    if (!Boolean.FALSE.equals(existing.getPasswordSetRequired())) {
                        existing.setPasswordSetRequired(false);
                        changed = true;
                    }
                    return changed ? userRepository.save(existing) : existing;
                })
                .orElseGet(() -> userRepository.save(User.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(rawPassword))
                        .fullName(fullName)
                        .role(role)
                        .status(UserStatus.ACTIVE)
                        .phoneNumber(phone)
                        .address(address)
                        .dateOfBirth(dateOfBirth)
                        .passwordSetRequired(false)
                        .isKycVerified(true)
                        .build()));
    }

    private void seedFullPtProfile(User pt, String bio, String philosophy, LocalDate startDate,
                                   Gender gender, String contactPhone, TrainingMode trainingMode,
                                   String location, BigDecimal hourlyRate, String rateUnit,
                                   List<String> specializations, List<String> goals, List<String> diets,
                                   List<CertificationData> certs) {
        ptProfileRepository.findByUserId(pt.getId())
                .ifPresentOrElse(profile -> {
                    profile.setIsVerified(true);
                    profile.setVerificationStatus(UserStatus.ACTIVE);
                    profile.setPtRequestStatus(UserStatus.ACTIVE);
                    ptProfileRepository.save(profile);
                }, () -> ptProfileRepository.save(PtProfile.builder()
                        .user(pt)
                        .isVerified(true)
                        .bio(bio)
                        .trainingPhilosophy(philosophy)
                        .experienceStartDate(startDate)
                        .gender(gender)
                        .contactPhone(contactPhone)
                        .trainingMode(trainingMode)
                        .location(location)
                        .hourlyRate(hourlyRate)
                        .rateUnit(rateUnit)
                        .specializations(specializations)
                        .preferredGoals(goals)
                        .preferredDietTypes(diets)
                        .certifications(certs)
                        .tier(Tier.TIER_1)
                        .rating(BigDecimal.valueOf(5.0))
                        .totalReviews(0)
                        .verificationStatus(UserStatus.ACTIVE)
                        .ptRequestStatus(UserStatus.ACTIVE)
                        .instagramUrl("https://instagram.com/pt.nutrican")
                        .linkedinUrl("https://linkedin.com/in/pt-nutrican")
                        .cvUrl("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf")
                        .portfolioShowcase(Map.of(
                                "coverPhotoUrl", "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop",
                                "transformations", List.of(
                                        Map.of(
                                                "id", "1",
                                                "title", "Giảm 15kg mỡ thừa trong 3 tháng",
                                                "story", "Học viên đã kiên trì theo lịch tập tạ 4 buổi/tuần và chế độ ăn Low-Carb. Kết quả sau 12 tuần thực sự ngoài sức mong đợi.",
                                                "beforeUrl", "https://images.unsplash.com/photo-1603233720066-237cb1017838?q=80&w=600&auto=format&fit=crop",
                                                "afterUrl", "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=600&auto=format&fit=crop"
                                        )
                                )
                        ))
                        .build()));
    }

    private void seedMapping(User pt, User customer, ClientMappingStatus status) {
        ptClientMappingRepository.findByPt_IdAndClient_Id(pt.getId(), customer.getId())
                .ifPresentOrElse(mapping -> {
                    mapping.setStatus(status);
                    ptClientMappingRepository.save(mapping);
                }, () -> ptClientMappingRepository.save(PtClientMapping.builder()
                        .pt(pt)
                        .client(customer)
                        .status(status)
                        .build()));
    }

    private void seedCustomerE2eProfile(User customer, NutritionGoal goal, int heightCm, String gender) {
        customer.setHeightCm(heightCm);
        customer.setGender(gender);
        customer.setNutritionGoal(goal);
        customer.setOnboardingCompletedAt(LocalDateTime.now());
        customer.setOnboardingStep(null);
        customer.setOnboardingSkippedAt(null);
        userRepository.save(customer);
    }

    private void seedMacroTarget(User customer, int calories, int protein, int carb, int fat) {
        macroTargetRepository.findByUserId(customer.getId())
                .ifPresentOrElse(existing -> {
                    existing.setDailyCalories(BigDecimal.valueOf(calories));
                    existing.setProtein(BigDecimal.valueOf(protein));
                    existing.setCarb(BigDecimal.valueOf(carb));
                    existing.setFat(BigDecimal.valueOf(fat));
                    macroTargetRepository.save(existing);
                }, () -> macroTargetRepository.save(MacroTarget.builder()
                        .user(customer)
                        .dailyCalories(BigDecimal.valueOf(calories))
                        .protein(BigDecimal.valueOf(protein))
                        .carb(BigDecimal.valueOf(carb))
                        .fat(BigDecimal.valueOf(fat))
                        .build()));
    }
}