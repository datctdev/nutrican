package com.sba;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Quan trọng: Báo cho Spring Boot biết quét code ở tất cả các module có chung package này
@SpringBootApplication(scanBasePackages = "com.sba.nutrican_be")
public class NutricanBeApplication {
    public static void main(String[] args) {
        SpringApplication.run(NutricanBeApplication.class, args);
    }
}