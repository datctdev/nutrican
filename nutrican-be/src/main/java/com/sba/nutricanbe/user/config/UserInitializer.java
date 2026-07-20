package com.sba.nutricanbe.user.config;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.entity.MacroTarget;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.NutritionGoal;
import com.sba.nutricanbe.user.enums.Tier;
import com.sba.nutricanbe.user.enums.TrainingMode;
import com.sba.nutricanbe.user.repository.MacroTargetRepository;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
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
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        User customerOne = seedUser(
                "customer1@gmail.com",
                DEFAULT_PASSWORD,
                "Nguyen Van Customer",
                UserRole.CUSTOMER,
                "0901000001",
                "12 Nguyen Trai, Quan 1, TP.HCM",
                LocalDate.of(1998, 3, 12));

        User customerTwo = seedUser(
                "customer2@gmail.com",
                DEFAULT_PASSWORD,
                "Tran Thi Hoc Vien",
                UserRole.CUSTOMER,
                "0901000002",
                "45 Le Loi, Quan 3, TP.HCM",
                LocalDate.of(2000, 8, 20));

        User certifiedPt = seedUser(
                "pt.certified@gmail.com",
                DEFAULT_PASSWORD,
                "Le Minh PT Certified",
                UserRole.PT_CERTIFIED,
                "0902000001",
                "Fitness Hub, Quan 7, TP.HCM",
                LocalDate.of(1992, 5, 6));

        User freelancePt = seedUser(
                "pt.freelance@gmail.com",
                DEFAULT_PASSWORD,
                "Pham Anh PT Freelance",
                UserRole.PT_FREELANCE,
                "0902000002",
                "Online Coaching, TP.HCM",
                LocalDate.of(1990, 11, 18));

        seedPtProfile(
                certifiedPt,
                "Chào bạn, mình là PT chuyên nghiệp với hơn 5 năm kinh nghiệm. Mình tin rằng mọi sự thay đổi đều bắt đầu từ thói quen nhỏ nhất. Hãy để mình đồng hành cùng bạn trên con đường chinh phục vóc dáng trong mơ.",
                "Kỷ luật là cầu nối giữa mục tiêu và thành tựu. Tập luyện không chỉ thay đổi cơ thể mà còn rèn giũa ý chí.",
                LocalDate.of(2016, 3, 1),
                List.of("Fat loss", "Muscle gain", "Meal planning"),
                Tier.TIER_1,
                TrainingMode.BOTH,
                BigDecimal.valueOf(1200000),
                BigDecimal.valueOf(450000));

        seedPtProfile(
                freelancePt,
                "Freelance PT specializing in busy professional meal routines.",
                "Simple tracking, honest feedback, and practical adjustments.",
                LocalDate.of(2019, 6, 1),
                List.of("Lifestyle coaching", "Home workout", "Vietnamese diet"),
                Tier.TIER_2,
                TrainingMode.ONLINE,
                BigDecimal.valueOf(900000),
                null);

        seedMapping(certifiedPt, customerOne, ClientMappingStatus.ACTIVE);
        seedMapping(freelancePt, customerTwo, ClientMappingStatus.PENDING);

        seedCustomerE2eProfile(customerOne, NutritionGoal.WEIGHT_LOSS, 170, "MALE");
        seedCustomerE2eProfile(customerTwo, NutritionGoal.WEIGHT_LOSS, 165, "FEMALE");
        seedMacroTarget(customerOne, 2000, 120, 220, 65);
        seedMacroTarget(customerTwo, 1900, 110, 200, 60);
        seedPtMarketplacePrefs(certifiedPt, List.of("WEIGHT_LOSS", "WEIGHT_GAIN"), List.of("NORMAL", "VEGETARIAN"));
        seedPtMarketplacePrefs(freelancePt, List.of("WEIGHT_LOSS", "MAINTAIN"), List.of("NORMAL", "KETO"));

        log.info("Seeded default users for hiring/chat test: {}, {}, {}, {}",
                customerOne.getEmail(), customerTwo.getEmail(), certifiedPt.getEmail(), freelancePt.getEmail());
    }

    private User seedUser(String email,
                          String rawPassword,
                          String fullName,
                          UserRole role,
                          String phone,
                          String address,
                          LocalDate dateOfBirth) {
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

    private void seedPtProfile(User pt,
                               String bio,
                               String philosophy,
                               LocalDate experienceStartDate,
                               List<String> specializations,
                               Tier tier,
                               TrainingMode trainingMode,
                               BigDecimal onlineRate,
                               BigDecimal offlineRate) {
        ptProfileRepository.findByUserId(pt.getId())
                .ifPresentOrElse(profile -> {
                    profile.setIsVerified(true);
                    profile.setVerificationStatus(UserStatus.ACTIVE);
                    profile.setPtRequestStatus(UserStatus.ACTIVE);
                    profile.setTrainingMode(trainingMode);
                    profile.setLocation(trainingMode == TrainingMode.ONLINE ? null : pt.getAddress());
                    profile.setOnlineRate(onlineRate);
                    profile.setOnlineRateUnit(onlineRate == null ? null : "MONTH");
                    profile.setOfflineRate(offlineRate);
                    profile.setOfflineRateUnit(offlineRate == null ? null : "SESSION_60");
                    ptProfileRepository.save(profile);
                }, () -> ptProfileRepository.save(PtProfile.builder()
                        .user(pt)
                        .isVerified(true)
                        .bio(bio)
                        .trainingPhilosophy(philosophy)
                        .experienceStartDate(experienceStartDate)
                        .specializations(specializations)
                        .tier(tier)
                        .trainingMode(trainingMode)
                        .location(trainingMode == TrainingMode.ONLINE ? null : pt.getAddress())
                        .onlineRate(onlineRate)
                        .onlineRateUnit(onlineRate == null ? null : "MONTH")
                        .offlineRate(offlineRate)
                        .offlineRateUnit(offlineRate == null ? null : "SESSION_60")
                        .rating(BigDecimal.valueOf(5.0))
                        .totalReviews(0)
                        .verificationStatus(UserStatus.ACTIVE)
                        .ptRequestStatus(UserStatus.ACTIVE)
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
                                        ),
                                        java.util.Map.of(
                                                "id", 2,
                                                "title", "Tăng 8kg cơ bắp, thay đổi vóc dáng",
                                                "story", "Từ một người gầy gò 55kg, bạn B đã áp dụng chế độ Bulk an toàn. Chú trọng các bài tập Compound như Squat, Deadlift, Bench Press. Giờ đây tự tin diện những bộ quần áo body.",
                                                "beforeUrl", "https://placehold.co/600x400/eeeeee/999999?text=Before+Image+2",
                                                "afterUrl", "https://placehold.co/600x400/d1fae5/065f46?text=After+Image+2"
                                        )
                                )
                        ))
                        .build()));
    }

    private void seedMapping(User pt, User customer, ClientMappingStatus status) {
        ptClientMappingRepository
                .findFirstByPt_IdAndClient_IdOrderByCreatedAtDesc(pt.getId(), customer.getId())
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

    private void seedPtMarketplacePrefs(User pt, List<String> goals, List<String> diets) {
        ptProfileRepository.findByUserId(pt.getId()).ifPresent(profile -> {
            profile.setPreferredGoals(goals);
            profile.setPreferredDietTypes(diets);
            ptProfileRepository.save(profile);
        });
    }
}
