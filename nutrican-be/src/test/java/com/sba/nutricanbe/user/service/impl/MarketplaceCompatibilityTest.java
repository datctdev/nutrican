package com.sba.nutricanbe.user.service.impl;

import com.sba.nutricanbe.user.dto.PtProfileResponse;
import com.sba.nutricanbe.user.dto.PtSearchRequest;
import com.sba.nutricanbe.user.entity.PtProfile;
import com.sba.nutricanbe.user.entity.User;
import com.sba.nutricanbe.user.repository.PtClientMappingRepository;
import com.sba.nutricanbe.user.repository.PtProfileRepository;
import com.sba.nutricanbe.user.repository.ReviewRepository;
import com.sba.nutricanbe.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketplaceCompatibilityTest {

    @Mock private PtProfileRepository ptProfileRepository;
    @Mock private UserRepository userRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private PtClientMappingRepository mappingRepository;
    @InjectMocks private MarketplaceServiceImpl marketplaceService;

    @Test
    void searchPts_filtersByGoal() {
        User u = org.mockito.Mockito.mock(User.class);
        UUID uid = UUID.randomUUID();
        when(u.getId()).thenReturn(uid);
        when(u.getFullName()).thenReturn("PT");
        PtProfile profile = PtProfile.builder()
                .user(u)
                .isVerified(true)
                .preferredGoals(List.of("WEIGHT_LOSS"))
                .maxClients(10)
                .build();
        when(ptProfileRepository.findByIsVerifiedTrue(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(profile)));
        when(mappingRepository.countByPt_IdAndStatus(any(), any())).thenReturn(2L);

        PtSearchRequest req = new PtSearchRequest();
        req.setVerifiedOnly(true);
        req.setGoalFilter("MUSCLE_GAIN");

        var page = marketplaceService.searchPts(req, null).getData();
        assertThat(page.getContent()).isEmpty();
    }

    @Test
    void searchPts_filtersByDietType() {
        User u = org.mockito.Mockito.mock(User.class);
        UUID uid = UUID.randomUUID();
        when(u.getId()).thenReturn(uid);
        when(u.getFullName()).thenReturn("PT");
        PtProfile profile = PtProfile.builder()
                .user(u)
                .isVerified(true)
                .preferredDietTypes(List.of("VEGAN"))
                .maxClients(10)
                .build();
        when(ptProfileRepository.findByIsVerifiedTrue(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(profile)));
        when(mappingRepository.countByPt_IdAndStatus(any(), any())).thenReturn(2L);

        PtSearchRequest req = new PtSearchRequest();
        req.setVerifiedOnly(true);
        req.setDietFilter("KETO");

        var page = marketplaceService.searchPts(req, null).getData();
        assertThat(page.getContent()).isEmpty();
    }
}
