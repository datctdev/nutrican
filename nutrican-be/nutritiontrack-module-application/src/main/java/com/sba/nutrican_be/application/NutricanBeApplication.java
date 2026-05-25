package com.sba.nutrican_be.application;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.sba.nutrican_be")
@EnableJpaRepositories(basePackages = "com.sba.nutrican_be.core.repository")
@EntityScan(basePackages = {"com.sba.nutrican_be.core.entity"}) // Quét các class @Entity (đổi lại thành package chứa Entity của bạn)
public class NutricanBeApplication {
    public static void main(String[] args) {
        SpringApplication.run(NutricanBeApplication.class, args);
    }
}
