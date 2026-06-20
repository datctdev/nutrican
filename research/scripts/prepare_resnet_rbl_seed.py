#!/usr/bin/env python3
"""Prepare RBL seed manifest from Vietnamese_Food_Dataset (10 ResNet classes)."""
from __future__ import annotations

import csv
import random
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATASET = Path(r"d:\FPT\SU26\SBA\project_team\research\Vietnamese_Food_Dataset\Vietnamese_Food_Dataset")
SEED_DIR = REPO / "research" / "seed" / "resnet10"
MANIFEST = REPO / "research" / "seed" / "resnet10_manifest.csv"

CLASSES = [
    "banh_chung", "banh_khot", "banh_mi", "banh_trang_nuong", "banh_xeo",
    "bun_dau_mam_tom", "ca_kho_to", "com_tam", "goi_cuon", "pho",
]

# PT ground-truth macros (per 100g) — same as FastAPI macro_database (Bien ban §3).
PT_MACROS = {
    "banh_chung": (600, 15, 65, 20),
    "banh_khot": (350, 12, 45, 15),
    "banh_mi": (400, 15, 45, 18),
    "banh_trang_nuong": (250, 8, 30, 10),
    "banh_xeo": (450, 16, 40, 22),
    "bun_dau_mam_tom": (550, 25, 60, 22),
    "ca_kho_to": (300, 20, 10, 18),
    "com_tam": (650, 30, 80, 25),
    "goi_cuon": (150, 8, 25, 2),
    "pho": (400, 20, 55, 12),
}

SAMPLES_PER_CLASS = 3
NEGATIVE_DIR = REPO / "research" / "seed" / "test"


def main() -> None:
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    rng = random.Random(42)

    for cls in CLASSES:
        images = sorted((DATASET / cls).glob("*.jpg")) + sorted((DATASET / cls).glob("*.jpeg"))
        picks = rng.sample(images, min(SAMPLES_PER_CLASS, len(images)))
        for i, src in enumerate(picks, start=1):
            dest = SEED_DIR / f"{cls}_{i:02d}{src.suffix.lower()}"
            shutil.copy2(src, dest)
            cal, pro, carb, fat = PT_MACROS[cls]
            rows.append(
                {
                    "filename": dest.name,
                    "food_code": cls,
                    "cohort": "HOME_HYBRID_DB",
                    "meal_source": "HOME_COOKED",
                    "meal_complexity": "SIMPLE",
                    "pt_cal": cal,
                    "pt_pro": pro,
                    "pt_carb": carb,
                    "pt_fat": fat,
                    "pt_action": "APPROVE",
                    "pt_correction_reason": "",
                    "notes": "ResNet10 validation sample",
                }
            )

    negatives = list(NEGATIVE_DIR.glob("smoke_*.png")) + list(NEGATIVE_DIR.glob("smoke_*.jpg"))
    for i, src in enumerate(negatives[:5], start=1):
        dest = SEED_DIR / f"negative_{i:02d}{src.suffix.lower()}"
        shutil.copy2(src, dest)
        rows.append(
            {
                "filename": dest.name,
                "food_code": "",
                "cohort": "RESTAURANT_AI_ONLY",
                "meal_source": "RESTAURANT",
                "meal_complexity": "SIMPLE",
                "pt_cal": "",
                "pt_pro": "",
                "pt_carb": "",
                "pt_fat": "",
                "pt_action": "REJECT",
                "pt_correction_reason": "WRONG_FOOD",
                "notes": "Out-of-scope negative sample",
            }
        )

    with MANIFEST.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "filename", "food_code", "cohort", "meal_source", "meal_complexity",
                "pt_cal", "pt_pro", "pt_carb", "pt_fat", "pt_action", "pt_correction_reason", "notes",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Copied {len(rows)} images to {SEED_DIR}")
    print(f"Manifest: {MANIFEST}")


if __name__ == "__main__":
    main()
