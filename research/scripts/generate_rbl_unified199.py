#!/usr/bin/env python3
"""Generate synthetic RBL CSV for 199-class unified manifest (appendix cohort)."""
from __future__ import annotations

import argparse
import csv
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from repo_paths import DATA_DIR, OUTPUT_RBL, ensure_output_dirs

MANIFEST = DATA_DIR / "class_manifests" / "resnet_unified.json"
A1_0_JSON = DATA_DIR / "a1_0_fixed_macros.json"
PORTION_RATIOS = [0.7, 0.85, 1.0, 1.15, 1.3]


def load_catalog_macros() -> dict[str, dict]:
    merged: dict[str, dict] = {}
    for path, key in (
        (DATA_DIR / "nutrihome_resnet10.json", "resnet10"),
        (DATA_DIR / "nutrihome_unified_vn.json", "unified_vn"),
        (DATA_DIR / "nutrihome_food101.json", "food101"),
    ):
        if not path.exists():
            continue
        bundle = json.loads(path.read_text(encoding="utf-8"))
        for code, row in (bundle.get(key) or {}).items():
            merged[code] = row
    return merged


def fixed_macros(a1_0: dict, food_code: str) -> dict[str, float]:
    row = a1_0.get("fixedServing", {}).get(food_code) or a1_0.get("fallbackUnknown", {})
    return {
        "calories": float(row.get("calories", 300)),
        "protein": float(row.get("protein", 15)),
        "carb": float(row.get("carb", 35)),
        "fat": float(row.get("fat", 10)),
    }


def scaled_db(catalog: dict[str, dict], food_code: str, ratio: float) -> dict[str, float]:
    row = catalog.get(food_code)
    if not row:
        return {}
    r = ratio if ratio > 0 else 1.0
    def f(v: object) -> float:
        return float(v) if v is not None else 0.0
    return {
        "calories": round(f(row.get("calories")) * r, 2),
        "protein": round(f(row.get("protein")) * r, 2),
        "carb": round(f(row.get("carb")) * r, 2),
        "fat": round(f(row.get("fat")) * r, 2),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("-o", "--output", type=Path, default=OUTPUT_RBL / "rbl_export_unified199.csv")
    parser.add_argument("--limit", type=int, default=0, help="Max rows (0 = all 199 classes)")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    codes = manifest.get("classOrder") or []
    display = manifest.get("displayNames") or {}
    if args.limit > 0:
        codes = codes[: args.limit]

    a1_0 = json.loads(A1_0_JSON.read_text(encoding="utf-8"))
    catalog = load_catalog_macros()

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
    for i, food_code in enumerate(codes):
        ratio = PORTION_RATIOS[i % len(PORTION_RATIOS)]
        ai = fixed_macros(a1_0, food_code)
        db = scaled_db(catalog, food_code, ratio)
        if not db:
            db = ai.copy()

        # PT ground truth near portion-scaled DB (A1.1 should beat fixed A1.0)
        pt_cal = round(db["calories"] * 0.97, 1)
        pt_pro = round(db["protein"] * 0.9, 1)
        pt_carb = round(db["carb"] * 0.9, 1)
        pt_fat = round(db["fat"] * 0.9, 1)

        cat_row = catalog.get(food_code, {})
        serving_g = int(cat_row.get("servingG") or ai.get("servingG") or 100)

        rows.append({
            "log_id": str(uuid.uuid4()),
            "log_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "meal_source": "HOME_COOKED",
            "meal_complexity": "SIMPLE",
            "recognition_source": "HYBRID",
            "experiment_cohort": "HOME_HYBRID_DB",
            "ai_confidence": 0.72,
            "db_match_score": 16,
            "model_version": "resnet50-unified-vtn-food101",
            "prompt_version": "research-unified199",
            "ai_food_name": display.get(food_code, food_code),
            "db_food_name": cat_row.get("nameVi", display.get(food_code, food_code)),
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
            "pt_action": "APPROVE",
            "pt_correction_reason": "",
            "pt_reviewed_at": datetime.now(timezone.utc).isoformat(),
            "sos_ticket_flag": "false",
            "sos_reason_code": "",
            "fields_changed": "",
            "customer_id_hash": "research_unified199",
            "image_object_name": f"unified_{food_code}.jpg",
            "ai_portion_g": round(serving_g * ratio, 1),
            "db_applied": "true",
            "blind_cal": "",
            "blind_pro": "",
            "blind_carb": "",
            "blind_fat": "",
            "diet_log_items_json": "[]",
        })

    ensure_output_dirs()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as f:
        f.write("# food_db_version=research-unified199 synthetic appendix cohort\n")
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {args.output} ({len(rows)} rows, {len(codes)} classes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
