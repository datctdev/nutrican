"""Collect training/eval images from single or multi-source class manifests."""
from __future__ import annotations

import re
from pathlib import Path

from repo_paths import DATASET_BY_KEY

IMG_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}

# Food-101 folder name -> unified food_code (merge into VN class)
DEFAULT_FOLDER_ALIASES: dict[str, str] = {
    "spring_rolls": "goi_cuon",
}


def normalize_folder(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[\s\-]+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return s


def resolve_folder_code(folder_name: str, aliases: dict[str, str]) -> str:
    raw = normalize_folder(folder_name)
    return aliases.get(raw, DEFAULT_FOLDER_ALIASES.get(raw, raw))


def _folder_map(root: Path) -> dict[str, Path]:
    out: dict[str, Path] = {}
    if not root.is_dir():
        return out
    for p in root.iterdir():
        if p.is_dir():
            out[normalize_folder(p.name)] = p
    return out


def collect_single_dataset(
    dataset_dir: Path, class_labels: list[str]
) -> list[tuple[Path, int]]:
    rows: list[tuple[Path, int]] = []
    folder_map = _folder_map(dataset_dir)
    for idx, class_name in enumerate(class_labels):
        class_dir = folder_map.get(class_name) or (dataset_dir / class_name)
        if not class_dir.is_dir():
            continue
        for img_path in sorted(class_dir.iterdir()):
            if img_path.suffix.lower() in IMG_SUFFIXES:
                rows.append((img_path, idx))
    return rows


def collect_unified_manifest(
    class_labels: list[str], manifest: dict
) -> list[tuple[Path, int]]:
    """Pool images from VTN_10 + 100 dishes + Food-101 into one label space."""
    aliases: dict[str, str] = dict(DEFAULT_FOLDER_ALIASES)
    aliases.update(manifest.get("classAliases") or manifest.get("class_aliases") or {})

    code_to_idx = {code: i for i, code in enumerate(class_labels)}
    rows: list[tuple[Path, int]] = []
    per_class: dict[str, int] = {c: 0 for c in class_labels}

    sources = manifest.get("datasetSources") or manifest.get("dataset_sources")
    if not sources:
        sources = [{"pathKey": k} for k in ("VTN_10", "DISHES_100", "FOOD101")]

    for source in sources:
        key = source.get("pathKey") or source.get("path_key")
        if not key or key not in DATASET_BY_KEY:
            print(f"[WARN] Unknown dataset source: {key}")
            continue
        root = DATASET_BY_KEY[key]
        if not root.is_dir():
            print(f"[WARN] Dataset missing: {root}")
            continue
        for folder in sorted(root.iterdir()):
            if not folder.is_dir():
                continue
            code = resolve_folder_code(folder.name, aliases)
            if code not in code_to_idx:
                continue
            idx = code_to_idx[code]
            for img_path in sorted(folder.iterdir()):
                if img_path.suffix.lower() in IMG_SUFFIXES:
                    rows.append((img_path, idx))
                    per_class[code] += 1

    with_images = sum(1 for c in class_labels if per_class[c] > 0)
    missing = [c for c in class_labels if per_class[c] == 0]
    print(
        f"Unified pool: {len(rows)} images | {with_images}/{len(class_labels)} classes with data"
    )
    if missing:
        print(f"[WARN] {len(missing)} classes with 0 images (e.g. {missing[:5]})")
    return rows


def collect_for_manifest(
    class_labels: list[str],
    manifest: dict,
    dataset_dir: Path | None = None,
) -> list[tuple[Path, int]]:
    if manifest.get("datasetSources") or manifest.get("dataset_sources"):
        return collect_unified_manifest(class_labels, manifest)
    if dataset_dir is None:
        raise ValueError("dataset_dir required for single-source manifest")
    return collect_single_dataset(dataset_dir, class_labels)
