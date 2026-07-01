#!/usr/bin/env python3
"""Build class manifest JSON profiles from dataset folders (additive; resnet10 unchanged)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from repo_paths import DISHES_100_IMAGES, FOOD101_IMAGES, REPO_ROOT, VTN_10_DATASET

OUT_DIR = REPO_ROOT / "research" / "data" / "class_manifests"
JAVA_OUT = (
    REPO_ROOT
    / "nutrican-be"
    / "nutritiontrack-module-ai-gateway"
    / "src"
    / "main"
    / "resources"
    / "data"
    / "class_manifests"
)

RESNET10_ORDER = [
    "banh_chung",
    "banh_khot",
    "banh_mi",
    "banh_trang_nuong",
    "banh_xeo",
    "bun_dau_mam_tom",
    "ca_kho_to",
    "com_tam",
    "goi_cuon",
    "pho",
]

RESNET10_DISPLAY = {
    "banh_chung": "Bánh Chưng",
    "banh_khot": "Bánh Khọt",
    "banh_mi": "Bánh Mì",
    "banh_trang_nuong": "Bánh Tráng Nướng",
    "banh_xeo": "Bánh Xèo",
    "bun_dau_mam_tom": "Bún Đậu Mắm Tôm",
    "ca_kho_to": "Cá Kho Tộ",
    "com_tam": "Cơm Tấm (Cơm sườn)",
    "goi_cuon": "Gỏi Cuốn",
    "pho": "Phở",
}


def normalize_code(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[\s\-]+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return s or "unknown"


def codes_from_dataset(root: Path) -> list[str]:
    if not root.is_dir():
        return []
    codes = sorted({normalize_code(p.name) for p in root.iterdir() if p.is_dir()})
    return [c for c in codes if c != "unknown"]


def display_from_code(code: str) -> str:
    return code.replace("_", " ").title()


def write_manifest(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {path} ({len(payload['classOrder'])} classes)")


def build_resnet10() -> dict:
    return {
        "profile": "resnet10",
        "description": "Default production profile — 10 Vietnamese dishes (unchanged workflow)",
        "modelVersion": "resnet50-vtn-10class",
        "defaultModelFile": "best_resnet50_unified.h5",
        "datasetPathKey": "VTN_10",
        "classOrder": RESNET10_ORDER,
        "displayNames": RESNET10_DISPLAY,
    }


def build_resnet100() -> dict:
    codes = codes_from_dataset(DISHES_100_IMAGES)
    return {
        "profile": "resnet100",
        "description": "100 Vietnamese dishes dataset (opt-in via RESNET_CLASS_PROFILE)",
        "modelVersion": "resnet50-vtn-100class",
        "defaultModelFile": "best_resnet50_vtn100.h5",
        "datasetPathKey": "DISHES_100",
        "classOrder": codes,
        "displayNames": {c: display_from_code(c) for c in codes},
    }


def build_resnet101() -> dict:
    codes = codes_from_dataset(FOOD101_IMAGES)
    return {
        "profile": "resnet101",
        "description": "Food-101 international dishes (opt-in via RESNET_CLASS_PROFILE)",
        "modelVersion": "resnet50-food101",
        "defaultModelFile": "best_resnet50_food101.h5",
        "datasetPathKey": "FOOD101",
        "classOrder": codes,
        "displayNames": {c: display_from_code(c) for c in codes},
    }


FOOD101_CLASS_ALIASES = {
    "spring_rolls": "goi_cuon",
}


def build_resnet_unified() -> dict:
    """Single model: VTN_10 + 100 VN dishes + Food-101 (deduped, aliases merged)."""
    aliases = dict(FOOD101_CLASS_ALIASES)
    all_codes: set[str] = set()

    for root in (VTN_10_DATASET, DISHES_100_IMAGES, FOOD101_IMAGES):
        if not root.is_dir():
            continue
        for p in root.iterdir():
            if p.is_dir():
                raw = normalize_code(p.name)
                code = aliases.get(raw, raw)
                if code != "unknown":
                    all_codes.add(code)

    # ResNet10 core first (stable indices for backward-compatible subset)
    order: list[str] = []
    for code in RESNET10_ORDER:
        if code in all_codes:
            order.append(code)
            all_codes.discard(code)
    order.extend(sorted(all_codes))

    display = dict(RESNET10_DISPLAY)
    for code in order:
        display.setdefault(code, display_from_code(code))

    return {
        "profile": "resnet_unified",
        "description": "Unified: Vietnamese_Food_Dataset (10) + 100 dishes + Food-101 — one model",
        "modelVersion": "resnet50-unified-vtn-food101",
        "defaultModelFile": "best_resnet50_unified.h5",
        "datasetPathKey": "UNIFIED",
        "classAliases": aliases,
        "datasetSources": [
            {"pathKey": "VTN_10", "label": "Vietnamese_Food_Dataset 10-class"},
            {"pathKey": "DISHES_100", "label": "100 Vietnamese dishes"},
            {"pathKey": "FOOD101", "label": "Food-101 international"},
        ],
        "classOrder": order,
        "displayNames": {c: display[c] for c in order},
    }


def main() -> int:
    manifests = {
        "resnet10": build_resnet10(),
        "resnet100": build_resnet100(),
        "resnet101": build_resnet101(),
        "resnet_unified": build_resnet_unified(),
    }
    for name, payload in manifests.items():
        write_manifest(OUT_DIR / f"{name}.json", payload)
        write_manifest(JAVA_OUT / f"{name}.json", payload)

    vtn_codes = set(codes_from_dataset(VTN_10_DATASET))
    overlap_100 = vtn_codes & set(manifests["resnet100"]["classOrder"])
    overlap_101 = vtn_codes & set(manifests["resnet101"]["classOrder"])
    print(f"VTN_10 folder check: {len(vtn_codes)} classes at {VTN_10_DATASET}")
    print(f"Overlap resnet10 vs resnet100 folder names: {sorted(overlap_100)}")
    unified = manifests["resnet_unified"]
    print(f"Unified class count: {len(unified['classOrder'])} (10 core + extensions)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
