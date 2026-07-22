package com.sba.nutricanbe.ai.service.impl;


import com.sba.nutricanbe.ai.catalog.ResNetClassManifest;

import com.sba.nutricanbe.ai.dto.FoodGatePreCheckResult;

import com.sba.nutricanbe.ai.dto.MealRecognitionResult;

import com.sba.nutricanbe.ai.dto.ResNetAnalyzeResponse;

import com.sba.nutricanbe.ai.service.ResNetFoodRecognitionClient;

import com.sba.nutricanbe.diet.enums.FoodGateResult;

import org.junit.jupiter.api.BeforeAll;

import org.junit.jupiter.api.Test;

import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;

import org.mockito.Mock;

import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.test.util.ReflectionTestUtils;


import java.math.BigDecimal;


import static org.junit.jupiter.api.Assertions.assertEquals;

import static org.mockito.ArgumentMatchers.any;

import static org.mockito.Mockito.when;

import org.springframework.mock.web.MockMultipartFile;


@ExtendWith(MockitoExtension.class)

class FoodGateServiceImplTest {


    @Mock private ResNetFoodRecognitionClient resNetClient;

    @InjectMocks private FoodGateServiceImpl gate;


    @BeforeAll

    static void loadManifest() {

        ResNetClassManifest.setActiveProfile("resnet_unified");

    }


    @org.junit.jupiter.api.BeforeEach

    void setMinConfidence() {

        ReflectionTestUtils.setField(gate, "minFoodConfidence", BigDecimal.valueOf(0.12));

    }


    @Test

    void notFoodWhenConfidenceBelowThreshold() {

        MealRecognitionResult result = MealRecognitionResult.builder()

                .foodCode("pho")

                .confidenceScore(BigDecimal.valueOf(0.05))

                .build();


        assertEquals(FoodGateResult.NOT_FOOD, gate.check(result));

    }


    @Test

    void outOfClassWhenCodeNotInManifest() {

        MealRecognitionResult result = MealRecognitionResult.builder()

                .foodCode("totally_unknown_food_xyz")

                .confidenceScore(BigDecimal.valueOf(0.95))

                .build();


        assertEquals(FoodGateResult.OUT_OF_CLASS, gate.check(result));

    }


    @Test

    void passWhenConfidenceOkAndCodeKnown() {

        MealRecognitionResult result = MealRecognitionResult.builder()

                .foodCode("pho")

                .confidenceScore(BigDecimal.valueOf(0.85))

                .build();


        assertEquals(FoodGateResult.PASS, gate.check(result));

    }


    @Test

    void preCheckRunsBeforeFullPipeline() {

        ResNetAnalyzeResponse response = new ResNetAnalyzeResponse();

        response.setSuccess(true);

        ResNetAnalyzeResponse.DataPayload data = new ResNetAnalyzeResponse.DataPayload();

        data.setFoodCode("pho");

        data.setConfidence(85);

        response.setData(data);

        when(resNetClient.analyze(any())).thenReturn(response);


        FoodGatePreCheckResult pre = gate.preCheck(new MockMultipartFile("file", "meal.jpg", "image/jpeg", new byte[]{1}));


        assertEquals(FoodGateResult.PASS, pre.gateResult());

        assertEquals(response, pre.resNetResponse());

    }


    @Test

    void preCheckNotFoodWhenResNetFails() {

        when(resNetClient.analyze(any())).thenReturn(new ResNetAnalyzeResponse());


        FoodGatePreCheckResult pre = gate.preCheck(new MockMultipartFile("file", "meal.jpg", "image/jpeg", new byte[]{1}));


        assertEquals(FoodGateResult.NOT_FOOD, pre.gateResult());

    }

}


