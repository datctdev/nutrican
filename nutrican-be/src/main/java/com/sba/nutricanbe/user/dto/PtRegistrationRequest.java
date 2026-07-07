package com.sba.nutricanbe.user.dto;

import com.sba.nutricanbe.user.enums.TrainingMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.sba.nutricanbe.user.enums.Gender;
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
    private String preferredTrack; // "CERTIFIED" or "FREELANCE"

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

    @NotEmpty(message = "Vui lòng chọn ít nhất 1 chuyên môn")
    private List<String> specializations;

    @NotNull(message = "Hình thức huấn luyện là bắt buộc")
    private TrainingMode trainingMode;

    @NotBlank(message = "Địa điểm hoạt động là bắt buộc")
    private String location;

    @NotNull(message = "Phí dịch vụ là bắt buộc")
    @DecimalMin(value = "0", message = "Phí dịch vụ không được âm")
    private BigDecimal hourlyRate;

    @NotNull(message = "Giới tính là bắt buộc")
    private Gender gender;

    @NotBlank(message = "Đơn vị tính phí là bắt buộc")
    private String rateUnit; // "HOUR" | "SESSION_60" | "SESSION_90" | "MONTH"

    @Valid
    private List<CertificationRequest> certifications;

    private String cvUrl;
    private String instagramUrl;
    private String linkedinUrl;
    private List<String> preferredGoals;
    private List<String> preferredDietTypes;
}
