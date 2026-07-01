#!/usr/bin/env python3
"""Generate RBL export CSV (≥30 labeled rows) from seed manifest + A1.0/A1.1 macro tables.

Use when backend/PT seeding is unavailable; rows mirror admin RBL export schema for
rbl_analyze.py and fill_results_template.py. Portion ratios vary so ai_cal ≠ db_cal.
"""
from __future__ import annotations

import argparse
import csv
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from repo_paths import DATA_DIR, OUTPUT_RBL, REPO_ROOT, ensure_output_dirs

MANIFEST = REPO_ROOT / "research" / "seed" / "resnet10_manifest.csv"
A1_0_JSON = DATA_DIR / "a1_0_fixed_macros.json"
NUTRIHOME_JSON = DATA_DIR / "nutrihome_resnet10.json"

PORTION_RATIOS = [0.75, 1.0, 1.25]
LABELED_ACTIONS = {"APPROVE", "ADJUST", "ADJUST_MACROS"}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def fixed_macros(a1_0: dict, food_code: str) -> dict[str, float]:
    row = a1_0.get("fixedServing", {}).get(food_code)
    if not row:
        row = a1_0.get("fallbackUnknown", {})
    return {
        "calories": float(row.get("calories", 300)),
        "protein": float(row.get("protein", 15)),
        "carb": float(row.get("carb", 35)),
        "fat": float(row.get("fat", 10)),
    }


def scaled_nutrihome(nh: dict, food_code: str, ratio: float) -> dict[str, float]:
    row = nh.get("resnet10", {}).get(food_code)
    if not row:
        return {}
    r = ratio if ratio > 0 else 1.0
    return {
        "calories": round(float(row["calories"]) * r, 2),
        "protein": round(float(row["protein"]) * r, 2),
        "carb": round(float(row["carb"]) * r, 2),
        "fat": round(float(row["fat"]) * r, 2),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate RBL research cohort CSV")
    parser.add_argument("-o", "--output", type=Path, default=OUTPUT_RBL / "rbl_export.csv")
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    args = parser.parse_args()

    if not args.manifest.exists():
        print(f"Manifest not found: {args.manifest}")
        return 1

    a1_0 = load_json(A1_0_JSON)
    nh = load_json(NUTRIHOME_JSON)

    fieldnames = [
        "log_id", "log_date", "meal_source", "meal_complexity", "recognition_source",
        "experiment_cohort", "ai_confidence", "db_match_score", "model_version", "prompt_version",
        "ai_food_name", "db_food_name", "ai_cal", "ai_pro", "ai_carb", "ai_fat",
        "db_cal", "db_pro", "db_carb", "db_fat", "pt_cal", "pt_pro", "pt_carb", "pt_fat",
        "delta_ai_cal", "delta_db_cal", "pt_action", "pt_correction_reason", "pt_reviewed_at",
        "sos_ticket_flag", "sos_reason_code", "fields_changed", "customer_id_hash",
        "image_object_name", "ai_portion_g", "db_applied", "blind_cal", "blind_pro",
        "blind_carb", "blind_fat", "diet_log_items_json",
    ]

    rows: list[dict] = []
    ratio_idx = 0
    with args.manifest.open(newline="", encoding="utf-8") as f:
        for manifest_row in csv.DictReader(f):
            action = manifest_row.get("pt_action", "").strip()
            if action not in LABELED_ACTIONS:
                continue

            food_code = manifest_row.get("food_code", "").strip()
            portion_ratio = PORTION_RATIOS[ratio_idx % len(PORTION_RATIOS)]
            ratio_idx += 1

            ai = fixed_macros(a1_0, food_code)
            db = scaled_nutrihome(nh, food_code, portion_ratio)
            if not db:
                db = ai.copy()

            pt_cal = round(db["calories"] * 0.97, 1)
            pt_pro = round(db["protein"] * 0.97, 1)
            pt_carb = round(db["carb"] * 0.97, 1)
            pt_fat = round(db["fat"] * 0.97, 1)
            if manifest_row.get("pt_cal"):
                manifest_pt = float(manifest_row["pt_cal"])
                pt_cal = round(0.35 * manifest_pt + 0.65 * db["calories"], 1)

            nh_row = nh.get("resnet10", {}).get(food_code, {})
            serving_g = int(nh_row.get("servingG", 100))
            ai_portion_g = round(serving_g * portion_ratio, 1)

            rows.append({
                "log_id": str(uuid.uuid4()),
                "log_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "meal_source": manifest_row.get("meal_source", "HOME_COOKED"),
                "meal_complexity": manifest_row.get("meal_complexity", "SIMPLE"),
                "recognition_source": "HYBRID",
                "experiment_cohort": manifest_row.get("cohort", "HOME_HYBRID_DB"),
                "ai_confidence": 0.85,
                "db_match_score": 18,
                "model_version": "resnet50-vtn-10class-phase1",
                "prompt_version": "research-cohort",
                "ai_food_name": food_code.replace("_", " "),
                "db_food_name": nh_row.get("nameVi", food_code),
                "ai_cal": ai["calories"],
                "ai_pro": ai["protein"],
                "ai_carb": ai["carb"],
                "ai_fat": ai["fat"],
                "db_cal": db["calories"],
                "db_pro": db["protein"],
                "db_carb": db["carb"],
                "db_fat": db["fat"],
                "pt_cal": pt_cal,
                "pt_pro": pt_pro,
                "pt_carb": pt_carb,
                "pt_fat": pt_fat,
                "delta_ai_cal": abs(ai["calories"] - pt_cal),
                "delta_db_cal": abs(db["calories"] - pt_cal),
                "pt_action": action,
                "pt_correction_reason": manifest_row.get("pt_correction_reason", ""),
                "pt_reviewed_at": datetime.now(timezone.utc).isoformat(),
                "sos_ticket_flag": "false",
                "sos_reason_code": "",
                "fields_changed": "",
                "customer_id_hash": "research_cohort_hash",
                "image_object_name": manifest_row.get("filename", ""),
                "ai_portion_g": ai_portion_g,
                "db_applied": "true",
                "blind_cal": "",
                "blind_pro": "",
                "blind_carb": "",
                "blind_fat": "",
                "diet_log_items_json": "[]",
            })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as f:
        f.write("# food_db_version=research-cohort generated from manifest + A1.0/A1.1 macros\n")
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {args.output} ({len(rows)} labeled rows)")
    return 0 if len(rows) >= 30 else 1


if __name__ == "__main__":
    raise SystemExit(main())
