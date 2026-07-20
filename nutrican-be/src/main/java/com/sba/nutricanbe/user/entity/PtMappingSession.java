package com.sba.nutricanbe.user.entity;

import com.sba.nutricanbe.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pt_mapping_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = true)
public class PtMappingSession extends BaseEntity {

    @Column(name = "mapping_id", nullable = false)
    private UUID mappingId;

    @Column(nullable = false)
    private Integer sequence;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "venue_id")
    private UUID venueId;

    @Column(name = "venue_name", length = 120)
    private String venueName;

    @Column(name = "venue_address", length = 500)
    private String venueAddress;

    @Column(name = "venue_maps_url", length = 500)
    private String venueMapsUrl;
}
