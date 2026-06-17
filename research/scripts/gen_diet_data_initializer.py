#!/usr/bin/env python3
"""Generate diet-tracker DataInitializer.java from VTN_FCT_2007 CSV."""
from __future__ import annotations

import csv
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CSV_PATH = REPO / "research" / "output" / "vtn_fct_2007_initializer.csv"
OUT_PATH = (
    REPO
    / "nutrican-be"
    / "nutritiontrack-module-diet-tracker"
    / "src"
    / "main"
    / "java"
    / "com"
    / "sba"
    / "nutrican_be"
    / "diet"
    / "config"
    / "DataInitializer.java"
)

HEADER = """package com.sba.nutrican_be.diet.config;

import com.sba.nutrican_be.core.entity.FoodItem;
import com.sba.nutrican_be.core.repository.FoodItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String CATEGORY = "VTN_FCT_2007";
    private static final String SOURCE = "VTN_FCT_2007";

    private final FoodItemRepository foodItemRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (foodItemRepository.count() > 0) {
            return;
        }
        List<FoodItem> items = buildVtnFct2007Foods();
        foodItemRepository.saveAll(items);
        log.info("Seeded {} VTN_FCT_2007 food items", items.size());
    }

    private static List<FoodItem> buildVtnFct2007Foods() {
        List<FoodItem> items = new ArrayList<>();
"""

FOOTER = """
        return items;
    }

    private static FoodItem food(String nameVi, int caloriesKcal, double protein, double carb, double fat) {
        return FoodItem.builder()
                .nameVi(nameVi)
                .category(CATEGORY)
                .servingSizeG(BigDecimal.valueOf(100))
                .calories(BigDecimal.valueOf(caloriesKcal))
                .protein(BigDecimal.valueOf(protein))
                .carb(BigDecimal.valueOf(carb))
                .fat(BigDecimal.valueOf(fat))
                .aliases(List.of())
                .isComposite(false)
                .source(SOURCE)
                .build();
    }
}
"""


def main() -> None:
    seed_lines: list[str] = []
    with CSV_PATH.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = row["name_vi"].replace("\\", "\\\\").replace('"', '\\"')
            cal = int(row["energy_cal"]) // 1000
            pro = float(row["protein_g"])
            fat = float(row["lipid_g"])
            carb = float(row["glucid_g"])
            seed_lines.append(f'        items.add(food("{name}", {cal}, {pro}, {carb}, {fat}));')

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(HEADER + "\n".join(seed_lines) + FOOTER, encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({len(seed_lines)} foods)")


if __name__ == "__main__":
    main()
