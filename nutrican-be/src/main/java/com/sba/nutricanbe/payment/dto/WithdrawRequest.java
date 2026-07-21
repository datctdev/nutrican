package com.sba.nutricanbe.payment.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class WithdrawRequest {

    @NotNull(message = "Số tiền rút không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền rút tối thiểu là 1.000đ")
    private BigDecimal amount;

    @NotBlank(message = "Số tài khoản không được để trống")
    @Pattern(regexp = "\\d{6,20}", message = "Số tài khoản phải gồm 6-20 chữ số")
    private String bankAccountNumber;

    @NotBlank(message = "Tên ngân hàng không được để trống")
    @Size(max = 100, message = "Tên ngân hàng tối đa 100 ký tự")
    private String bankName;
}
