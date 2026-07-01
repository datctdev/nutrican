#!/usr/bin/env python3
"""Map 100-dishes + unified VN codes to NutriHome PDF macros via fuzzy name match.

Output: research/data/nutrihome_unified_vn.json
Sync copy to nutrican-be/src/main/resources/data/
"""
from __future__ import annotations

import json
import re
import shutil
import unicodedata
from pathlib import Path

from repo_paths import DATA_DIR, REPO_ROOT

MANIFEST_UNIFIED = DATA_DIR / "class_manifests" / "resnet_unified.json"
MANIFEST_100 = DATA_DIR / "class_manifests" / "resnet100.json"
NUTRIHOME_FOODS = DATA_DIR / "nutrihome_foods.json"
OUT = DATA_DIR / "nutrihome_unified_vn.json"
BE_OUT = REPO_ROOT / "nutrican-be" / "src" / "main" / "resources" / "data" / "nutrihome_unified_vn.json"

# Manual overrides where fuzzy match is weak (food_code -> NutriHome nameVi)
MANUAL: dict[str, str] = {
    "banh_trang_nuong": "Bánh tráng trộn",
    "goi_cuon": "Gỏi bì cuốn",
    "ca_kho_to": "Cá lóc kho",
    "baba_nau_chuoi_dau": "Ba ba nấu chuối đậu",
    "banh_tom_ho_tay": "Bánh tôm Hồ Tây",
    "cha_ca_la_vong": "Chả cá lã vọng",
}

# 9 VN dishes with no NutriHome match — macros per 100g finished dish (manual reference)
MANUAL_MACROS: dict[str, dict] = {
    "cut_lon_xao_me": {
        "nameVi": "Cật lợn xào me",
        "calories": 140,
        "protein": 15,
        "fat": 5,
        "carb": 4,
        "note": "Cật lợn, sốt me, đường, dầu ăn",
    },
    "ga_hap_la_chanh": {
        "nameVi": "Gà hấp lá chanh",
        "calories": 180,
        "protein": 33,
        "fat": 5,
        "carb": 0,
        "note": "Gà hấp nguyên bản, không thêm dầu mỡ (mid 160–200 kcal)",
    },
    "khau_nhuc": {
        "nameVi": "Khâu nhục",
        "calories": 380,
        "protein": 12,
        "fat": 30,
        "carb": 8,
        "note": "Thịt ba chỉ, mạch nha/đường, khoai môn rán (mid 350–410 kcal)",
    },
    "kho_muc_nuong": {
        "nameVi": "Khô mực nướng",
        "calories": 290,
        "protein": 60,
        "fat": 3,
        "carb": 5,
        "note": "Mực khô cô đặc, protein cao, ít mỡ",
    },
    "nem_nuong_nha_trang": {
        "nameVi": "Nem nướng Nha Trang",
        "calories": 240,
        "protein": 18,
        "fat": 16,
        "carb": 3,
        "note": "Thịt nạc giã trộn mỡ gáy heo (mid 230–250 kcal)",
    },
    "oc_buou_hap": {
        "nameVi": "Ốc bươu hấp sả",
        "calories": 85,
        "protein": 16,
        "fat": 0.5,
        "carb": 2,
        "note": "Protein ốc, sả gia vị thanh đạm",
    },
    "oc_huong_xao": {
        "nameVi": "Ốc hương xào tỏi/bơ",
        "calories": 140,
        "protein": 14,
        "fat": 8,
        "carb": 3,
        "note": "Ốc thấp calo, tăng kcal do dầu/bơ xào (mid 130–150 kcal)",
    },
    "rau_muong_xao": {
        "nameVi": "Rau muống xào tỏi",
        "calories": 110,
        "protein": 3,
        "fat": 9,
        "carb": 5,
        "note": "Rau muống + dầu ăn khi xào (mid 100–120 kcal)",
    },
    "thit_trau_gac_bep": {
        "nameVi": "Thịt trâu gác bếp",
        "calories": 270,
        "protein": 47,
        "fat": 8,
        "carb": 2,
        "note": "Thịt trâu sấy khô, dinh dưỡng cô đặc (mid 260–280 kcal)",
    },
}


def normalize(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def score(query: str, candidate: str) -> float:
    q, c = normalize(query), normalize(candidate)
    if not q or not c:
        return 0.0
    if q == c:
        return 1.0
    if q in c or c in q:
        return 0.85
    q_tokens = set(q.split())
    c_tokens = set(c.split())
    if not q_tokens:
        return 0.0
    overlap = len(q_tokens & c_tokens) / len(q_tokens)
    return overlap


def estimate_serving_g(unit: str) -> int:
    u = (unit or "").lower()
    patterns = [
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
        ("1 bát", 300),
    ]
    for key, grams in patterns:
        if key in u:
            return grams
    m = re.search(r"(\d+)\s*g", u)
    return int(m.group(1)) if m else 200


def main() -> int:
    unified = json.loads(MANIFEST_UNIFIED.read_text(encoding="utf-8"))
    resnet100 = json.loads(MANIFEST_100.read_text(encoding="utf-8"))
    foods_data = json.loads(NUTRIHOME_FOODS.read_text(encoding="utf-8"))
    all_foods = foods_data.get("all_foods") or []

    display = unified.get("displayNames") or {}
    codes_100 = list(resnet100.get("classOrder") or [])
    # Skip codes already in nutrihome_resnet10 bundle (loaded separately in Java)
    resnet10_codes = set((unified.get("classOrder") or [])[:10])

    mapped: dict[str, dict] = {}
    unmatched: list[str] = []

    for code in codes_100:
        if code in resnet10_codes:
            continue
        target_name = MANUAL.get(code) or display.get(code) or code.replace("_", " ")
        best_row = None
        best_score = 0.0
        for row in all_foods:
            name_vi = row.get("nameVi") or ""
            sc = score(target_name, name_vi)
            if sc > best_score:
                best_score = sc
                best_row = row
        if best_row is None or best_score < 0.45:
            unmatched.append(code)
            continue
        serving_g = best_row.get("servingG") or estimate_serving_g(best_row.get("unit") or "")
        mapped[code] = {
            "foodCode": code,
            "nameVi": best_row["nameVi"],
            "unit": best_row.get("unit") or "",
            "servingG": serving_g,
            "calories": best_row.get("calories"),
            "protein": best_row.get("protein"),
            "fat": best_row.get("fat"),
            "carb": best_row.get("carb"),
            "category": best_row.get("category") or "",
            "nutrihomeStt": best_row.get("stt"),
            "matchScore": round(best_score, 3),
            "queryName": target_name,
        }

    for code, manual in MANUAL_MACROS.items():
        mapped[code] = {
            "foodCode": code,
            "nameVi": manual["nameVi"],
            "unit": "100g",
            "servingG": 100,
            "calories": manual["calories"],
            "protein": manual["protein"],
            "fat": manual["fat"],
            "carb": manual["carb"],
            "category": "Món ResNet50 (manual 100g)",
            "matchScore": 1.0,
            "queryName": manual["nameVi"],
            "macroSource": "manual_100g_reference",
            "note": manual.get("note", ""),
        }
        if code in unmatched:
            unmatched.remove(code)

    payload = {
        "source": "Fuzzy match resnet100 -> nutrihome_foods.json + manual 100g macros (9 dishes)",
        "profile": "resnet_unified",
        "mappedCount": len(mapped),
        "manualMacroCount": len(MANUAL_MACROS),
        "unmatchedCount": len(unmatched),
        "unmatched": unmatched,
        "unified_vn": mapped,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    BE_OUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT, BE_OUT)

    print(f"Mapped {len(mapped)}/{len(codes_100) - len(resnet10_codes)} VN dish codes")
    print(f"Unmatched: {len(unmatched)} -> {unmatched[:10]}{'...' if len(unmatched) > 10 else ''}")
    print(f"Wrote {OUT}")
    print(f"Synced {BE_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
