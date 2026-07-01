#!/usr/bin/env python3
"""Build A1.0 fixed-serving macros for all ResNet unified classes.

VTN-10 keeps curated fixed servings; other classes use catalog standard serving (no portion scale).

Output:
  research/data/a1_0_fixed_macros.json
  nutrican-be/src/main/resources/data/a1_0_fixed_macros.json
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from repo_paths import DATA_DIR, REPO_ROOT

MANIFEST = DATA_DIR / "class_manifests" / "resnet_unified.json"
RESNET10 = DATA_DIR / "nutrihome_resnet10.json"
UNIFIED_VN = DATA_DIR / "nutrihome_unified_vn.json"
FOOD101 = DATA_DIR / "nutrihome_food101.json"
EXISTING = REPO_ROOT / "nutrican-be" / "src" / "main" / "resources" / "data" / "a1_0_fixed_macros.json"
OUT = DATA_DIR / "a1_0_fixed_macros.json"
BE_OUT = EXISTING

VTN10_CODES = {
    "banh_chung", "banh_khot", "banh_mi", "banh_trang_nuong", "banh_xeo",
    "bun_dau_mam_tom", "ca_kho_to", "com_tam", "goi_cuon", "pho",
}


def load_macro_maps() -> dict[str, dict]:
    merged: dict[str, dict] = {}

    def ingest(bundle: dict, key: str) -> None:
        for code, row in (bundle.get(key) or {}).items():
            merged[code] = row

    resnet10 = json.loads(RESNET10.read_text(encoding="utf-8"))
    ingest(resnet10, "resnet10")
    ingest(resnet10, "variants")

    unified = json.loads(UNIFIED_VN.read_text(encoding="utf-8"))
    ingest(unified, "unified_vn")

    food101 = json.loads(FOOD101.read_text(encoding="utf-8"))
    ingest(food101, "food101")

    return merged


def to_fixed_entry(row: dict) -> dict:
    serving_g = int(row.get("servingG") or 100)
    return {
        "calories": round(float(row.get("calories") or 0), 1),
        "protein": round(float(row.get("protein") or 0), 1),
        "fat": round(float(row.get("fat") or 0), 1),
        "carb": round(float(row.get("carb") or 0), 1),
        "servingG": serving_g,
        "unit": row.get("unit") or f"{serving_g}g",
    }


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    class_order = manifest.get("classOrder") or []
    catalog = load_macro_maps()

    existing = json.loads(EXISTING.read_text(encoding="utf-8")) if EXISTING.exists() else {}
    vtn10_preserved = (existing.get("fixedServing") or {})
    fallback = existing.get("fallbackUnknown") or {
        "calories": 300, "protein": 15, "carb": 35, "fat": 10, "servingG": 100,
    }

    fixed: dict[str, dict] = {}
    missing: list[str] = []

    for code in class_order:
        if code in VTN10_CODES and code in vtn10_preserved:
            fixed[code] = vtn10_preserved[code]
            continue
        row = catalog.get(code)
        if row is None:
            missing.append(code)
            fixed[code] = dict(fallback)
            fixed[code]["unit"] = "100g (fallback)"
            continue
        fixed[code] = to_fixed_entry(row)

    payload = {
        "source": "VTN-10 curated + NutriHome/unified/food101 standard serving (A1.0 no portion scale)",
        "note": "RBL ai_predicted_macros — fixed 1 serving per code, not scaled by portion_ratio.",
        "extractedAt": "2026-06-27",
        "classCount": len(fixed),
        "missingFromCatalog": missing,
        "fixedServing": fixed,
        "fallbackUnknown": fallback,
    }

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    BE_OUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT, BE_OUT)

    print(f"Built A1.0 fixed macros: {len(fixed)} classes")
    if missing:
        print(f"Fallback used for {len(missing)} codes: {missing[:5]}...")
    print(f"Wrote {OUT}")
    print(f"Synced {BE_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
