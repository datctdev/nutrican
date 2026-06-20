#!/usr/bin/env python3
"""Generate diet-tracker FoodCatalogDataInitializer.java from VTN_FCT_2007 CSV."""
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
    / "FoodCatalogDataInitializer.java"
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
public class FoodCatalogDataInitializer implements CommandLineRunner {

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

    private static FoodItem food(
            String nameVi,
            String nameEn,
            String category,
            List<String> aliases,
            int caloriesKcal,
            double protein,
            double carb,
            double fat) {
        return FoodItem.builder()
                .nameVi(nameVi)
                .nameEn(nameEn)
                .category(category)
                .aliases(aliases)
                .servingSizeG(BigDecimal.valueOf(100))
                .calories(BigDecimal.valueOf(caloriesKcal))
                .protein(BigDecimal.valueOf(protein))
                .carb(BigDecimal.valueOf(carb))
                .fat(BigDecimal.valueOf(fat))
                .isComposite(false)
                .source(SOURCE)
                .build();
    }
}
"""


def _java_string(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _java_string_or_null(value: str) -> str:
    value = (value or "").strip()
    return "null" if not value else _java_string(value)


def _java_aliases(raw: str) -> str:
    aliases = [part.strip() for part in (raw or "").split("|") if part.strip()]
    if not aliases:
        return "List.of()"
    parts = ", ".join(_java_string(alias) for alias in aliases)
    return f"List.of({parts})"


def main() -> None:
    seed_lines: list[str] = []
    with CSV_PATH.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name_vi = _java_string(row["name_vi"])
            name_en = _java_string_or_null(row["name_en"])
            category = _java_string(row["category"])
            aliases = _java_aliases(row["aliases"])
            cal = int(row["energy_cal"]) // 1000
            pro = float(row["protein_g"])
            fat = float(row["lipid_g"])
            carb = float(row["glucid_g"])
            seed_lines.append(
                f"        items.add(food({name_vi}, {name_en}, {category}, {aliases}, {cal}, {pro}, {carb}, {fat}));"
            )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(HEADER + "\n".join(seed_lines) + FOOTER, encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({len(seed_lines)} foods)")


if __name__ == "__main__":
    main()
