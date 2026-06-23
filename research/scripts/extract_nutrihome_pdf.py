#!/usr/bin/env python3
"""Extract full NutriHome calorie table PDF → JSON for NutriCan (LLaVA + ResNet + Food DB).

Source: bang-luong-calo-trong-thuc-pham.pdf (NutriHome, 21 pages, ~333 món)

Outputs:
  research/data/nutrihome_foods.json       — full catalog
  research/data/nutrihome_resnet10.json  — 10 ResNet classes + variants
  research/data/nutrihome_by_category.json — grouped by Phân loại
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

from repo_paths import DATA_DIR, DEFAULT_PDF, REPO_ROOT

# ResNet10 food_code → exact NutriHome dish name (PDF row)
RESNET_NUTRIHOME_MAP: dict[str, str] = {
    "banh_chung": "Bánh chưng",
    "banh_khot": "Bánh khọt",
    "banh_mi": "Bánh mì ổ",
    "banh_trang_nuong": "Bánh tráng trộn",
    "banh_xeo": "Bánh xèo",
    "bun_dau_mam_tom": "Bún đậu mắm tôm",
    "ca_kho_to": "Cá lóc kho",
    "com_tam": "Cơm tấm sườn",
    "goi_cuon": "Gỏi bì cuốn",
    "pho": "Phở bò tái",
}

# Extra variants LLaVA may distinguish (not separate ResNet classes)
RESNET_VARIANTS: dict[str, str] = {
    "com_tam_bi": "Cơm tấm bì",
    "com_tam_cha": "Cơm tấm chả",
    "pho_ga": "Phở gà",
    "pho_bo_chin": "Phở bò chín",
    "pho_bo_vien": "Phở bò viên",
}

# Standard serving weight (grams) — longer/more specific keys first
SERVING_G_PATTERNS: list[tuple[str, int]] = [
    ("1 đĩa 5 cái", 150),
    ("1 ổ trung", 250),
    ("3 cuốn", 120),
    ("1 suất", 400),
    ("1 phần", 350),
    ("1 tô", 500),
    ("100g", 100),
    ("1 đĩa", 200),
    ("1 ổ", 250),
    ("1 cái", 200),
]

# ResNet dishes where PDF unit is per-piece but app uses composite serving
COMPOSITE_SERVING: dict[str, dict] = {
    "ca_kho_to": {
        "servingG": 350,
        "unit": "1 tộ (~3 lát + nước kho)",
        "sliceMultiplier": 2.5,
        "note": "Scaled from NutriHome 'Cá lóc kho' 1 lát cá",
    },
}

# Override servingG for specific ResNet classes (grams for portion scaling)
RESNET_SERVING_G: dict[str, int] = {
    "banh_xeo": 180,
    "banh_chung": 200,
    "banh_trang_nuong": 200,
}


def parse_float(val: str | None) -> float | None:
    if val is None:
        return None
    s = str(val).strip().replace(",", ".")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def estimate_serving_g(unit: str, name: str) -> int | None:
    u = unit.strip().lower()
    for key, grams in SERVING_G_PATTERNS:
        if key in u:
            return grams
    m = re.search(r"(\d+)\s*g", u)
    if m:
        return int(m.group(1))
    if "lát" in u:
        return 80
    if "cơm tấm" in name.lower():
        return 350
    if "phở" in name.lower():
        return 500 if "tô" in u else 400
    if "bún đậu" in name.lower():
        return 400
    if "gỏi" in name.lower() and "cuốn" in name.lower():
        return 120
    return None


def extract_tables(pdf_path: Path) -> list[dict]:
    rows: list[dict] = []
    seen_stt: set[int] = set()

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            for table in page.extract_tables() or []:
                if not table or not table[0] or table[0][0] != "STT":
                    continue
                for raw in table[1:]:
                    if not raw or len(raw) < 7:
                        continue
                    stt_raw = (raw[0] or "").strip()
                    if not stt_raw.isdigit():
                        continue
                    stt = int(stt_raw)
                    if stt in seen_stt:
                        continue
                    name = (raw[1] or "").strip()
                    if not name:
                        continue
                    unit = (raw[2] or "").strip()
                    cal = parse_float(raw[3])
                    if cal is None:
                        continue
                    row = {
                        "stt": stt,
                        "nameVi": name,
                        "unit": unit,
                        "calories": round(cal, 2),
                        "protein": parse_float(raw[4]),
                        "fat": parse_float(raw[5]),
                        "carb": parse_float(raw[6]),
                        "category": (raw[7] or "").strip() if len(raw) > 7 else None,
                        "servingG": estimate_serving_g(unit, name),
                        "source": "NUTRIHOME_PDF",
                        "sourcePage": page_num,
                    }
                    rows.append(row)
                    seen_stt.add(stt)

    rows.sort(key=lambda r: r["stt"])
    return rows


def find_by_name(all_rows: list[dict], target: str) -> dict | None:
    t = target.lower()
    for r in all_rows:
        if r["nameVi"].lower() == t:
            return r
    for r in all_rows:
        if t in r["nameVi"].lower() or r["nameVi"].lower() in t:
            return r
    return None


def to_resnet_entry(row: dict, food_code: str) -> dict:
    entry = {
        "foodCode": food_code,
        "nameVi": row["nameVi"],
        "unit": row["unit"],
        "servingG": row.get("servingG") or estimate_serving_g(row["unit"], row["nameVi"]),
        "calories": row["calories"],
        "protein": row["protein"],
        "fat": row["fat"],
        "carb": row["carb"],
        "category": row.get("category"),
        "nutrihomeStt": row["stt"],
        "source": "NUTRIHOME_PDF",
    }
    composite = COMPOSITE_SERVING.get(food_code)
    if composite:
        mult = composite["sliceMultiplier"]
        entry["unit"] = composite["unit"]
        entry["servingG"] = composite["servingG"]
        entry["calories"] = round(row["calories"] * mult, 1)
        if row.get("protein"):
            entry["protein"] = round(row["protein"] * mult, 1)
        if row.get("fat"):
            entry["fat"] = round(row["fat"] * mult, 1)
        if row.get("carb"):
            entry["carb"] = round(row["carb"] * mult, 1)
        entry["compositeNote"] = composite.get("note")
    if food_code in RESNET_SERVING_G:
        entry["servingG"] = RESNET_SERVING_G[food_code]
    return entry


def build_resnet_bundle(all_rows: list[dict]) -> tuple[dict, dict]:
    resnet10: dict = {}
    variants: dict = {}
    missing: list[str] = []

    for code, target in RESNET_NUTRIHOME_MAP.items():
        match = find_by_name(all_rows, target)
        if match:
            resnet10[code] = to_resnet_entry(match, code)
        else:
            missing.append(f"{code} → {target}")

    for var_code, target in RESNET_VARIANTS.items():
        match = find_by_name(all_rows, target)
        if match:
            entry = to_resnet_entry(match, var_code)
            variants[var_code] = entry
        else:
            missing.append(f"variant {var_code} → {target}")

    # aliases
    variants["com_tam_suon"] = {"aliasOf": "com_tam"}
    variants["pho_bo"] = {"aliasOf": "pho"}

    return resnet10, variants, missing


def group_by_category(all_rows: list[dict]) -> dict[str, list[dict]]:
    groups: dict[str, list] = defaultdict(list)
    for r in all_rows:
        cat = r.get("category") or "Khác"
        groups[cat].append(
            {
                "stt": r["stt"],
                "nameVi": r["nameVi"],
                "unit": r["unit"],
                "calories": r["calories"],
                "protein": r["protein"],
                "fat": r["fat"],
                "carb": r["carb"],
            }
        )
    return dict(sorted(groups.items(), key=lambda x: x[0]))


def per_100g(row: dict) -> dict | None:
    g = row.get("servingG")
    if not g or g <= 0:
        return None
    factor = 100.0 / g
    return {
        "calories": round(row["calories"] * factor, 1),
        "protein": round(row["protein"] * factor, 1) if row.get("protein") else None,
        "fat": round(row["fat"] * factor, 1) if row.get("fat") else None,
        "carb": round(row["carb"] * factor, 1) if row.get("carb") else None,
    }


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Extract NutriHome PDF → JSON")
    parser.add_argument(
        "--pdf",
        type=Path,
        default=DEFAULT_PDF,
        help=f"Path to bang-luong-calo-trong-thuc-pham.pdf (default: {DEFAULT_PDF})",
    )
    args = parser.parse_args()
    pdf_path = args.pdf.resolve()

    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        print(f"Place the file at: {DEFAULT_PDF}", file=sys.stderr)
        return 1

    all_rows = extract_tables(pdf_path)
    if not all_rows:
        print("No rows extracted — check PDF format", file=sys.stderr)
        return 1

    resnet10, variants, missing = build_resnet_bundle(all_rows)
    by_category = group_by_category(all_rows)

    ts = datetime.now(timezone.utc).isoformat()
    foods_payload = {
        "meta": {
            "source_pdf": str(pdf_path),
            "publisher": "NutriHome",
            "title": "Bảng lượng calo trong thực phẩm, thức ăn Việt Nam",
            "extractedAt": ts,
            "totalFoods": len(all_rows),
            "columns": ["stt", "nameVi", "unit", "calories", "protein", "fat", "carb", "category"],
            "note": "Single source of truth for NutriCan macro reference. Do not re-parse PDF manually.",
        },
        "all_foods": all_rows,
    }

    resnet_payload = {
        "source": "bang-luong-calo-trong-thuc-pham.pdf (NutriHome)",
        "extractedAt": ts,
        "note": "ResNet50 10-class + LLaVA variants — macros per standard serving from NutriHome PDF",
        "resnet10": resnet10,
        "variants": variants,
        "missingMappings": missing,
    }

    category_payload = {
        "meta": {"extractedAt": ts, "categories": len(by_category)},
        "by_category": by_category,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "nutrihome_foods.json").write_text(
        json.dumps(foods_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DATA_DIR / "nutrihome_resnet10.json").write_text(
        json.dumps(resnet_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DATA_DIR / "nutrihome_by_category.json").write_text(
        json.dumps(category_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Per-100g reference for AI scaling
    per100 = {}
    for code, entry in resnet10.items():
        if isinstance(entry, dict) and "calories" in entry:
            p = per_100g(entry)
            if p:
                per100[code] = p
    (DATA_DIR / "nutrihome_resnet10_per100g.json").write_text(
        json.dumps({"per100g": per100, "extractedAt": ts}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Extracted {len(all_rows)} foods from PDF")
    print(f"ResNet10 mapped: {len(resnet10)}/10")
    if missing:
        print("Missing:", missing)
    print(f"Categories: {len(by_category)}")
    print(f"Wrote → {DATA_DIR}/nutrihome_foods.json")
    print(f"Wrote → {DATA_DIR}/nutrihome_resnet10.json")
    print(f"Wrote → {DATA_DIR}/nutrihome_by_category.json")
    print(f"Wrote → {DATA_DIR}/nutrihome_resnet10_per100g.json")

    # Sync to Spring Boot classpath (single source of truth)
    gateway_data = REPO_ROOT / "nutrican-be" / "nutritiontrack-module-ai-gateway" / "src" / "main" / "resources" / "data"
    gateway_data.mkdir(parents=True, exist_ok=True)
    for name in ("nutrihome_foods.json", "nutrihome_resnet10.json", "nutrihome_resnet10_per100g.json"):
        shutil.copy2(DATA_DIR / name, gateway_data / name)
    print(f"Synced JSON → {gateway_data}")

    # Print ResNet10 summary for verification
    print("\n--- ResNet10 NutriHome macros ---")
    for code in sorted(resnet10.keys()):
        e = resnet10[code]
        print(
            f"  {code:20} {e['nameVi']:22} {e['calories']:7.1f} kcal  "
            f"P{e.get('protein')} F{e.get('fat')} C{e.get('carb')}  ({e['unit']}, ~{e.get('servingG')}g)"
        )
    return 0 if len(resnet10) == 10 else 1


if __name__ == "__main__":
    raise SystemExit(main())
