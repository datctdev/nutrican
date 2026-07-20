package com.sba.nutricanbe.user.repository;

import com.sba.nutricanbe.user.entity.PtAvailabilityWindow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PtAvailabilityWindowRepository extends JpaRepository<PtAvailabilityWindow, UUID> {

    List<PtAvailabilityWindow> findByPtProfile_IdOrderByDayOfWeekAscStartTimeAsc(UUID ptProfileId);

    void deleteByPtProfile_Id(UUID ptProfileId);
}
