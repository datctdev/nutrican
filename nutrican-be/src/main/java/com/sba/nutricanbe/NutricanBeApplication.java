package com.sba.nutricanbe;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NutricanBeApplication {

    public static void main(String[] args) {
        SpringApplication.run(NutricanBeApplication.class, args);
    }

}
