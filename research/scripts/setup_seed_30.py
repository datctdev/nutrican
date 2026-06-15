#!/usr/bin/env python3
"""Copy 30 user food photos into research/seed/images/ and write manifest.csv."""
from __future__ import annotations

import csv
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ASSETS = Path(
    r"C:\Users\ASUS\.cursor\projects\d-FPT-SU26-SBA-project-team-nutrican\assets"
)
IMAGES = REPO / "research" / "seed" / "images"
TEST = REPO / "research" / "seed" / "test"
MANIFEST = REPO / "research" / "seed" / "manifest.csv"

# source suffix (unique uuid tail) -> target filename
MAPPING: list[tuple[str, str]] = [
    ("images_t_i_xu_ng__1_-1e0597b7", "home_01.png"),
    ("images_t_i_xu_ng__4_-fd35c76f", "home_02.png"),
    ("images_b_n_b__hu_-22126246", "home_03.png"),
    ("images_banh-mi-362-e326c861", "home_04.png"),
    ("images_batch_27537659454965956636883554122700616027799818n-16686523473052041984893-50ba3286", "home_05.png"),
    ("images_mi-quang-quang-nam-99ca5e8d", "home_06.png"),
    ("images_Ph__g_-d1d5c5f4", "home_07.png"),
    ("images_t_i_xu_ng-549cd06b", "home_08.png"),
    ("52ae2b24-78b3", "home_09.png"),
    ("images_bun-thit-nuong-kieu-mien-nam-be818a56", "home_10.png"),
    ("images_b_nh_cu_n-5abbbb79", "home_11.png"),
    ("images_com_ga_chien_nuoc_mam-10f1d76d", "home_12.png"),
    ("images_cach-nuong-pizza-thumbnail-8e20e9b7", "rest_01.png"),
    ("images_t_i_xu_ng__2_-abefa1ff", "rest_02.png"),
    ("images_t_i_xu_ng__3_-edc5520a", "rest_03.png"),
    ("images_g__n__ng-6dce938f", "rest_04.png"),
    ("images_heo_quay-1b92c095", "rest_05.png"),
    ("images_thit-kho-hot-vit-bfd4978b", "rest_06.png"),
    ("images_c__n__ng-ddbb34b9", "rest_07.png"),
    ("images_images-d3c84813", "rest_08.png"),
    ("images_____n_nh__h_ng_1-4efbca25", "buffet_01.png"),
    ("images_____n_nh__h_ng_2-03302ade", "buffet_02.png"),
    ("images_____n_nh__h_ng_3-11e8d81d", "buffet_03.png"),
    ("images_____n_nh__h_ng_4-1a099396", "buffet_04.png"),
    ("images_lau-ga-la-e-6268-23703619", "hotpot_01.png"),
    ("images_xoi-xeo-mien-bac-mon-an-sang-truyen-thong-dam-da-huong-que-3886ed92", "mix_01.png"),
    ("images_cach-lam-banh-khot-1_06187869db3b4e878857e0587f3a1c09-d4beebbc", "mix_02.png"),
    ("images_ch__l_a-6d05261a", "mix_03.png"),
    ("images_tr_ng_chi_n-07aac59a", "mix_04.png"),
    ("images_b_nh_kh_t-ce513c18", "mix_05.png"),
]

ROWS: list[dict[str, str]] = [
    {"filename": "home_01.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "450", "pt_pro": "25", "pt_carb": "55", "pt_fat": "12", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Pho bo"},
    {"filename": "home_02.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "620", "pt_pro": "30", "pt_carb": "75", "pt_fat": "20", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Com tam suon"},
    {"filename": "home_03.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "480", "pt_pro": "28", "pt_carb": "58", "pt_fat": "14", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Bun bo Hue"},
    {"filename": "home_04.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "380", "pt_pro": "15", "pt_carb": "45", "pt_fat": "14", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Banh mi thit"},
    {"filename": "home_05.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "420", "pt_pro": "22", "pt_carb": "50", "pt_fat": "12", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Hu tieu Nam Vang"},
    {"filename": "home_06.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "480", "pt_pro": "24", "pt_carb": "58", "pt_fat": "16", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Mi Quang"},
    {"filename": "home_07.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "450", "pt_pro": "28", "pt_carb": "48", "pt_fat": "12", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "true", "notes": "Pho ga"},
    {"filename": "home_08.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "420", "pt_pro": "14", "pt_carb": "45", "pt_fat": "20", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Banh xeo"},
    {"filename": "home_09.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "520", "pt_pro": "28", "pt_carb": "60", "pt_fat": "16", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Bun cha"},
    {"filename": "home_10.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "500", "pt_pro": "26", "pt_carb": "62", "pt_fat": "14", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Bun thit nuong"},
    {"filename": "home_11.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "280", "pt_pro": "12", "pt_carb": "42", "pt_fat": "6", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Banh cuon"},
    {"filename": "home_12.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "550", "pt_pro": "32", "pt_carb": "65", "pt_fat": "15", "cohort_target": "HOME_HYBRID_DB", "blind_estimate": "false", "notes": "Com ga chien nuoc mam"},
    {"filename": "rest_01.png", "meal_source": "RESTAURANT", "meal_complexity": "SIMPLE", "restaurant_name": "Pizza 4P", "pt_cal": "720", "pt_pro": "35", "pt_carb": "75", "pt_fat": "28", "cohort_target": "RESTAURANT_AI_ONLY", "blind_estimate": "false", "notes": "Pizza"},
    {"filename": "rest_02.png", "meal_source": "RESTAURANT", "meal_complexity": "SIMPLE", "restaurant_name": "KFC", "pt_cal": "850", "pt_pro": "40", "pt_carb": "80", "pt_fat": "35", "cohort_target": "RESTAURANT_AI_ONLY", "blind_estimate": "true", "notes": "Burger"},
    {"filename": "rest_03.png", "meal_source": "RESTAURANT", "meal_complexity": "SIMPLE", "restaurant_name": "Pho Thin", "pt_cal": "540", "pt_pro": "28", "pt_carb": "56", "pt_fat": "16", "cohort_target": "RESTAURANT_HYBRID", "blind_estimate": "false", "notes": "Pho bo quan"},
    {"filename": "rest_04.png", "meal_source": "RESTAURANT", "meal_complexity": "SIMPLE", "restaurant_name": "Ga Nuong Quan", "pt_cal": "680", "pt_pro": "45", "pt_carb": "20", "pt_fat": "38", "cohort_target": "RESTAURANT_AI_ONLY", "blind_estimate": "false", "notes": "Ga nuong nguyen con"},
    {"filename": "rest_05.png", "meal_source": "RESTAURANT", "meal_complexity": "SIMPLE", "restaurant_name": "Heo Quay Quan", "pt_cal": "720", "pt_pro": "35", "pt_carb": "5", "pt_fat": "55", "cohort_target": "RESTAURANT_AI_ONLY", "blind_estimate": "false", "notes": "Thit heo quay"},
    {"filename": "rest_06.png", "meal_source": "RESTAURANT", "meal_complexity": "SIMPLE", "restaurant_name": "Com Binh Dan", "pt_cal": "580", "pt_pro": "32", "pt_carb": "25", "pt_fat": "35", "cohort_target": "RESTAURANT_AI_ONLY", "blind_estimate": "false", "notes": "Thit kho trung"},
    {"filename": "rest_07.png", "meal_source": "RESTAURANT", "meal_complexity": "SIMPLE", "restaurant_name": "Ca Nuong Quan", "pt_cal": "650", "pt_pro": "48", "pt_carb": "30", "pt_fat": "28", "cohort_target": "RESTAURANT_AI_ONLY", "blind_estimate": "false", "notes": "Ca nuong cuon banh trang"},
    {"filename": "rest_08.png", "meal_source": "RESTAURANT", "meal_complexity": "SIMPLE", "restaurant_name": "Street food", "pt_cal": "320", "pt_pro": "8", "pt_carb": "52", "pt_fat": "6", "cohort_target": "RESTAURANT_AI_ONLY", "blind_estimate": "true", "notes": "Xoi ngu sac"},
    {"filename": "buffet_01.png", "meal_source": "RESTAURANT", "meal_complexity": "COMPOSITE", "restaurant_name": "Korean BBQ King", "pt_cal": "920", "pt_pro": "42", "pt_carb": "45", "pt_fat": "52", "cohort_target": "COMPOSITE_BUFFET", "blind_estimate": "false", "notes": "Korean BBQ spread 1"},
    {"filename": "buffet_02.png", "meal_source": "RESTAURANT", "meal_complexity": "COMPOSITE", "restaurant_name": "Korean BBQ King", "pt_cal": "880", "pt_pro": "40", "pt_carb": "48", "pt_fat": "48", "cohort_target": "COMPOSITE_BUFFET", "blind_estimate": "false", "notes": "Korean BBQ spread 2"},
    {"filename": "buffet_03.png", "meal_source": "RESTAURANT", "meal_complexity": "COMPOSITE", "restaurant_name": "Korean BBQ King", "pt_cal": "900", "pt_pro": "41", "pt_carb": "46", "pt_fat": "50", "cohort_target": "COMPOSITE_BUFFET", "blind_estimate": "false", "notes": "Korean BBQ spread 3"},
    {"filename": "buffet_04.png", "meal_source": "RESTAURANT", "meal_complexity": "COMPOSITE", "restaurant_name": "Korean BBQ King", "pt_cal": "910", "pt_pro": "43", "pt_carb": "44", "pt_fat": "51", "cohort_target": "COMPOSITE_BUFFET", "blind_estimate": "true", "notes": "Korean BBQ spread 4"},
    {"filename": "hotpot_01.png", "meal_source": "HOME_COOKED", "meal_complexity": "HOTPOT", "restaurant_name": "", "pt_cal": "900", "pt_pro": "45", "pt_carb": "60", "pt_fat": "35", "cohort_target": "HOTPOT_HYBRID", "blind_estimate": "false", "notes": "Lau ga la e"},
    {"filename": "mix_01.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "350", "pt_pro": "10", "pt_carb": "58", "pt_fat": "8", "cohort_target": "HOME_AI_ONLY", "blind_estimate": "false", "notes": "Xoi xeo (ngoai DB)"},
    {"filename": "mix_02.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "380", "pt_pro": "12", "pt_carb": "55", "pt_fat": "10", "cohort_target": "HOME_AI_ONLY", "blind_estimate": "false", "notes": "Banh khot"},
    {"filename": "mix_03.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "180", "pt_pro": "14", "pt_carb": "4", "pt_fat": "10", "cohort_target": "HOME_AI_ONLY", "blind_estimate": "false", "notes": "Cha lua"},
    {"filename": "mix_04.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "220", "pt_pro": "14", "pt_carb": "6", "pt_fat": "14", "cohort_target": "HOME_AI_ONLY", "blind_estimate": "false", "notes": "Cha trung"},
    {"filename": "mix_05.png", "meal_source": "HOME_COOKED", "meal_complexity": "SIMPLE", "restaurant_name": "", "pt_cal": "360", "pt_pro": "11", "pt_carb": "52", "pt_fat": "11", "cohort_target": "HOME_AI_ONLY", "blind_estimate": "false", "notes": "Banh khot variant"},
]

FIELDS = [
    "filename", "meal_source", "meal_complexity", "restaurant_name",
    "hotpot_broth_id", "hotpot_item_ids", "composite_item_ids",
    "pt_cal", "pt_pro", "pt_carb", "pt_fat", "cohort_target", "blind_estimate", "notes",
]


def find_source(suffix: str) -> Path:
    matches = [p for p in ASSETS.glob("*.png") if suffix in p.name]
    if not matches:
        raise FileNotFoundError(f"No asset matching {suffix!r}")
    return max(matches, key=lambda p: p.stat().st_mtime)


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    TEST.mkdir(parents=True, exist_ok=True)
    copied = 0
    for suffix, target in MAPPING:
        src = find_source(suffix)
        dst = IMAGES / target
        shutil.copy2(src, dst)
        copied += 1
        print(f"OK {target} <- {src.name[:60]}...")
    shutil.copy2(IMAGES / "home_01.png", TEST / "smoke_pho.png")
    shutil.copy2(IMAGES / "rest_01.png", TEST / "smoke_pizza.png")
    with MANIFEST.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for row in ROWS:
            w.writerow({k: row.get(k, "") for k in FIELDS})
    print(f"\nCopied {copied} images -> {IMAGES}")
    print(f"G0 test: {TEST / 'smoke_pho.png'}, {TEST / 'smoke_pizza.png'}")
    print(f"Manifest: {MANIFEST} ({len(ROWS)} rows)")


if __name__ == "__main__":
    main()
