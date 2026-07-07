"""ResNet class manifest profiles — default resnet_unified (199 classes)."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent.parent
MANIFEST_DIR = REPO_ROOT / "research" / "data" / "class_manifests"

DEFAULT_PROFILE = "resnet_unified"


def active_profile() -> str:
    return os.environ.get("RESNET_CLASS_PROFILE", DEFAULT_PROFILE).strip().lower() or DEFAULT_PROFILE


def _manifest_path(profile: str | None = None) -> Path:
    prof = profile or active_profile()
    return MANIFEST_DIR / f"{prof}.json"


def load_manifest(profile: str | None = None) -> dict:
    path = _manifest_path(profile)
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"Class manifest not found: {path}")


def class_names(profile: str | None = None) -> list[str]:
    data = load_manifest(profile)
    order = data.get("classOrder") or data.get("class_order")
    if not order:
        raise ValueError(f"Manifest {data.get('profile')} missing classOrder")
    return list(order)


def display_names(profile: str | None = None) -> dict[str, str]:
    data = load_manifest(profile)
    names = data.get("displayNames") or data.get("display_names") or {}
    order = class_names(profile)
    out = {code: names.get(code, _title(code)) for code in order}
    return out


def model_version(profile: str | None = None) -> str:
    data = load_manifest(profile)
    return str(data.get("modelVersion") or data.get("model_version") or "resnet50-unknown")


def default_model_filename(profile: str | None = None) -> str:
    data = load_manifest(profile)
    return str(
        data.get("defaultModelFile")
        or data.get("default_model_file")
        or "best_resnet50_unified.h5"
    )


def dataset_hint(profile: str | None = None) -> str | None:
    data = load_manifest(profile)
    return data.get("datasetPathKey") or data.get("dataset_path_key")


def _title(code: str) -> str:
    return re.sub(r"\s+", " ", code.replace("_", " ")).title()


CLASS_NAMES = class_names()
DISPLAY_NAMES = display_names()
MODEL_VERSION_MANIFEST = model_version()
