#!/usr/bin/env python3
"""Build synthetic RBL export CSV from resnet10_manifest (offline pipeline check)."""
from __future__ import annotations

import argparse
import csv
import uuid
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = REPO_ROOT / "research" / "seed" / "resnet10_manifest.csv"
DEFAULT_OUT = REPO_ROOT / "research" / "output" / "resnet_rbl_export.csv"
MODEL = "resnet50-vtn-10class"

# Mock A1.0 macros (FastAPI macro_database) — per 100g portion default
AI_MACROS = {
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

DISPLAY = {
    "banh_chung": "Bánh Chưng",
    "banh_khot": "Bánh Khọt",
    "banh_mi": "Bánh Mì",
    "banh_trang_nuong": "Bánh Tráng Nướng",
    "banh_xeo": "Bánh Xèo",
    "bun_dau_mam_tom": "Bún Đậu Mắm Tôm",
    "ca_kho_to": "Cá Kho Tộ",
    "com_tam": "Cơm Tấm",
    "goi_cuon": "Gỏi Cuốn",
    "pho": "Phở",
}

COLUMNS = [
    "log_id", "log_date", "meal_source", "meal_complexity", "recognition_source",
    "experiment_cohort", "ai_confidence", "db_match_score", "model_version", "prompt_version",
    "ai_food_name", "db_food_name", "ai_cal", "ai_pro", "ai_carb", "ai_fat",
    "db_cal", "db_pro", "db_carb", "db_fat", "pt_cal", "pt_pro", "pt_carb", "pt_fat",
    "delta_ai_cal", "delta_db_cal", "pt_action", "pt_correction_reason", "pt_reviewed_at",
    "sos_ticket_flag", "sos_reason_code", "fields_changed", "customer_id_hash", "image_object_name",
    "ai_portion_g", "db_applied", "blind_cal", "blind_pro", "blind_carb", "blind_fat",
    "diet_log_items_json",
]


def load_manifest(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    rows = load_manifest(MANIFEST)
    out_rows: list[dict[str, str | float | int | bool]] = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")

    for row in rows:
        code = row.get("food_code", "").strip()
        is_negative = not code
        log_id = str(uuid.uuid4())
        ai_conf = 0.32 if is_negative else 0.35

        if is_negative:
            ai_cal, ai_pro, ai_carb, ai_fat = 720, 35, 75, 28
            db_cal = db_pro = db_carb = db_fat = ""
            db_name = ""
            db_score = 0
            rec = "AI_ONLY"
            pt_action = "REJECT"
            pt_reason = "WRONG_FOOD"
            pt_cal = pt_pro = pt_carb = pt_fat = ""
            delta_ai = delta_db = ""
            db_applied = False
            ai_name = "Pizza"
        else:
            ai_cal, ai_pro, ai_carb, ai_fat = AI_MACROS[code]
            pt_cal = float(row.get("pt_cal") or ai_cal)
            pt_pro = float(row.get("pt_pro") or ai_pro)
            pt_carb = float(row.get("pt_carb") or ai_carb)
            pt_fat = float(row.get("pt_fat") or ai_fat)
            db_cal = round(pt_cal * 0.95)
            db_pro = round(pt_pro * 0.98)
            db_carb = round(pt_carb * 0.97)
            db_fat = round(pt_fat * 0.96)
            db_name = DISPLAY.get(code, code)
            db_score = 18
            rec = "HYBRID"
            pt_action = row.get("pt_action", "APPROVE")
            pt_reason = row.get("pt_correction_reason", "")
            delta_ai = abs(ai_cal - pt_cal)
            delta_db = abs(db_cal - pt_cal)
            db_applied = True
            ai_name = DISPLAY.get(code, code)

        out_rows.append(
            {
                "log_id": log_id,
                "log_date": now[:10],
                "meal_source": row.get("meal_source", "HOME_COOKED"),
                "meal_complexity": row.get("meal_complexity", "SIMPLE"),
                "recognition_source": rec,
                "experiment_cohort": row.get("cohort", "HOME_HYBRID_DB"),
                "ai_confidence": ai_conf,
                "db_match_score": db_score,
                "model_version": MODEL,
                "prompt_version": "resnet10-class-hash",
                "ai_food_name": ai_name,
                "db_food_name": db_name,
                "ai_cal": ai_cal,
                "ai_pro": ai_pro,
                "ai_carb": ai_carb,
                "ai_fat": ai_fat,
                "db_cal": db_cal,
                "db_pro": db_pro,
                "db_carb": db_carb,
                "db_fat": db_fat,
                "pt_cal": pt_cal,
                "pt_pro": pt_pro,
                "pt_carb": pt_carb,
                "pt_fat": pt_fat,
                "delta_ai_cal": delta_ai,
                "delta_db_cal": delta_db,
                "pt_action": pt_action,
                "pt_correction_reason": pt_reason,
                "pt_reviewed_at": now,
                "sos_ticket_flag": False,
                "sos_reason_code": "",
                "fields_changed": "",
                "customer_id_hash": "resnet-seed",
                "image_object_name": row.get("filename", ""),
                "ai_portion_g": 100,
                "db_applied": db_applied,
                "blind_cal": "",
                "blind_pro": "",
                "blind_carb": "",
                "blind_fat": "",
                "diet_log_items_json": "[]",
            }
        )

    labeled = [r for r in out_rows if r["pt_action"] in {"APPROVE", "ADJUST", "ADJUST_MACROS"}]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as f:
        f.write("# food_db_version=vtn-526+resnet10\n")
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(labeled)

    print(f"Wrote {len(labeled)} labeled rows -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
