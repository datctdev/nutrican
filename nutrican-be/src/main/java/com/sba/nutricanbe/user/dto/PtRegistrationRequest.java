package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.Gender;
import com.sba.nutricanbe.user.enums.TrainingMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PtRegistrationRequest {

    @NotBlank(message = "Loại hình mong muốn là bắt buộc")
    private String preferredTrack;

    @NotBlank(message = "Giới thiệu bản thân là bắt buộc")
    @Size(min = 100, message = "Giới thiệu bản thân tối thiểu 100 ký tự")
    private String bio;

    @NotBlank(message = "Triết lý huấn luyện là bắt buộc")
    @Size(min = 50, message = "Triết lý huấn luyện tối thiểu 50 ký tự")
    private String trainingPhilosophy;

    @NotBlank(message = "Số điện thoại là bắt buộc")
    private String contactPhone;

    @NotNull(message = "Ngày bắt đầu làm PT là bắt buộc")
    private LocalDate experienceStartDate;

    @NotEmpty(message = "Vui lòng chọn ít nhất một chuyên môn")
    private List<String> specializations;

    @NotNull(message = "Hình thức huấn luyện là bắt buộc")
    private TrainingMode trainingMode;

    private String location;

    @DecimalMin(value = "0", inclusive = false, message = "Phí huấn luyện online phải lớn hơn 0")
    private BigDecimal onlineRate;

    private String onlineRateUnit;

    @DecimalMin(value = "0", inclusive = false, message = "Phí huấn luyện offline phải lớn hơn 0")
    private BigDecimal offlineRate;

    private String offlineRateUnit;

    @NotNull(message = "Giới tính là bắt buộc")
    private Gender gender;

    @Valid
    private List<CertificationRequest> certifications;

    private String cvUrl;
    private String instagramUrl;
    private String linkedinUrl;
    private List<String> preferredGoals;
    private List<String> preferredDietTypes;

    @Valid
    private List<PtVenueRequest> venues;

    @Valid
    private List<PtAvailabilityWindowRequest> availabilityWindows;
}
