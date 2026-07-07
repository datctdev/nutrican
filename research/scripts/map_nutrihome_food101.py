#!/usr/bin/env python3
"""Convert Food-101 nutrition.csv (101 foods, multi-weight rows) to NutriHome-style JSON.

Output: research/data/nutrihome_food101.json
Sync copy to nutrican-be/src/main/resources/data/
"""
from __future__ import annotations

import csv
import json
import re
import shutil
import unicodedata
from collections import defaultdict
from pathlib import Path

from repo_paths import DATA_DIR, NUTRITION_CSV, REPO_ROOT

MANIFEST_101 = DATA_DIR / "class_manifests" / "resnet101.json"
OUT = DATA_DIR / "nutrihome_food101.json"
BE_OUT = REPO_ROOT / "nutrican-be" / "src" / "main" / "resources" / "data" / "nutrihome_food101.json"

# CSV labels that are not already snake_case Food-101 codes
LABEL_TO_CODE: dict[str, str] = {
    "Cupcakes": "cup_cakes",
    "Fish and Chips": "fish_and_chips",
    "Grilled Cheese": "grilled_cheese_sandwich",
    "Hot and Sour Soup": "hot_and_sour_soup",
    "Lobster Roll": "lobster_roll_sandwich",
    "Macaroni and Cheese": "macaroni_and_cheese",
    "Shrimp and Grits": "shrimp_and_grits",
}


def normalize_label(label: str) -> str:
    s = unicodedata.normalize("NFD", label.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", "_", s).strip("_")


def resolve_code(label: str, codes: set[str]) -> str | None:
    if label in LABEL_TO_CODE:
        return LABEL_TO_CODE[label]
    if label in codes:
        return label
    snake = normalize_label(label.replace(" and ", " "))
    if snake in codes:
        return snake
    return None


def pick_serving_row(rows: list[dict[str, str]]) -> dict[str, str]:
    """Pick the weight row closest to 100 g (typical reference serving)."""
    parsed = []
    for row in rows:
        weight = int(float(row["weight"]))
        parsed.append((abs(weight - 100), weight, row))
    parsed.sort(key=lambda t: (t[0], t[1]))
    return parsed[0][2]


def main() -> int:
    if not NUTRITION_CSV.exists():
        raise SystemExit(f"nutrition.csv not found: {NUTRITION_CSV}")

    manifest = json.loads(MANIFEST_101.read_text(encoding="utf-8"))
    codes = set(manifest.get("classOrder") or [])
    display = manifest.get("displayNames") or {}

    by_label: dict[str, list[dict[str, str]]] = defaultdict(list)
    with NUTRITION_CSV.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            by_label[row["label"].strip()].append(row)

    mapped: dict[str, dict] = {}
    unmatched_labels: list[str] = []
    missing_codes: list[str] = list(codes)

    for label, rows in sorted(by_label.items()):
        code = resolve_code(label, codes)
        if code is None:
            unmatched_labels.append(label)
            continue
        serving = pick_serving_row(rows)
        weight = int(float(serving["weight"]))
        mapped[code] = {
            "foodCode": code,
            "nameVi": display.get(code) or label.replace("_", " ").title(),
            "unit": f"{weight}g",
            "servingG": weight,
            "calories": float(serving["calories"]),
            "protein": float(serving["protein"]),
            "fat": float(serving["fats"]),
            "carb": float(serving["carbohydrates"]),
            "fiber": float(serving["fiber"]),
            "sugars": float(serving["sugars"]),
            "sodium": float(serving["sodium"]),
            "category": "Food-101",
            "csvLabel": label,
        }
        if code in missing_codes:
            missing_codes.remove(code)

    payload = {
        "source": str(NUTRITION_CSV),
        "profile": "resnet_unified",
        "mappedCount": len(mapped),
        "expectedCount": len(codes),
        "unmatchedLabels": unmatched_labels,
        "missingCodes": missing_codes,
        "food101": mapped,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    BE_OUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT, BE_OUT)

    print(f"Mapped {len(mapped)}/{len(codes)} Food-101 codes from {NUTRITION_CSV.name}")
    if unmatched_labels:
        print(f"Unmatched CSV labels ({len(unmatched_labels)}): {unmatched_labels}")
    if missing_codes:
        print(f"Missing codes ({len(missing_codes)}): {missing_codes[:10]}")
    print(f"Wrote {OUT}")
    print(f"Synced {BE_OUT}")
    return 0 if len(mapped) == len(codes) else 1


if __name__ == "__main__":
    raise SystemExit(main())
