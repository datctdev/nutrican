package com.sba.nutricanbe.user.config;

import com.sba.nutricanbe.common.enums.UserRole;
import com.sba.nutricanbe.common.enums.UserStatus;
import com.sba.nutricanbe.user.entity.PtClientMapping;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.enums.ClientMappingStatus;
import com.sba.nutricanbe.user.enums.Tier;
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
                "Certified nutrition coach with strength training focus.",
                "Build sustainable habits, then optimize performance.",
                8,
                List.of("Fat loss", "Muscle gain", "Meal planning"),
                Tier.TIER_1,
                BigDecimal.valueOf(450000),
                "NASM-CPT, Precision Nutrition Level 1");

        seedPtProfile(
                freelancePt,
                "Freelance PT specializing in busy professional meal routines.",
                "Simple tracking, honest feedback, and practical adjustments.",
                5,
                List.of("Lifestyle coaching", "Home workout", "Vietnamese diet"),
                Tier.TIER_2,
                BigDecimal.valueOf(300000),
                "ACE-CPT");

        seedMapping(certifiedPt, customerOne, ClientMappingStatus.ACTIVE);
        seedMapping(freelancePt, customerTwo, ClientMappingStatus.PENDING);

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
                               int yearsOfExperience,
                               List<String> specializations,
                               Tier tier,
                               BigDecimal hourlyRate,
                               String certifications) {
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
                        .yearsOfExperience(yearsOfExperience)
                        .specializations(specializations)
                        .tier(tier)
                        .hourlyRate(hourlyRate)
                        .certifications(certifications)
                        .rating(BigDecimal.valueOf(5.0))
                        .totalReviews(0)
                        .verificationStatus(UserStatus.ACTIVE)
                        .ptRequestStatus(UserStatus.ACTIVE)
                        .build()));
    }

    private void seedMapping(User pt, User customer, ClientMappingStatus status) {
        ptClientMappingRepository.findByPt_IdAndClient_Id(pt.getId(), customer.getId())
                .ifPresentOrElse(mapping -> {
                    if (mapping.getStatus() != status) {
                        mapping.setStatus(status);
                        ptClientMappingRepository.save(mapping);
                    }
                }, () -> ptClientMappingRepository.save(PtClientMapping.builder()
                        .pt(pt)
                        .client(customer)
                        .status(status)
                        .build()));
    }
}
