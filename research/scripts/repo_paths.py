"""Portable paths relative to the nutrican git repository root."""
from __future__ import annotations

from pathlib import Path

# research/scripts/repo_paths.py → parents[2] = nutrican/
REPO_ROOT = Path(__file__).resolve().parents[2]

RESEARCH_DIR = REPO_ROOT / "research"
DATA_DIR = RESEARCH_DIR / "data"
OUTPUT_DIR = RESEARCH_DIR / "output"

DEFAULT_PDF = RESEARCH_DIR / "bang-luong-calo-trong-thuc-pham.pdf"
DEFAULT_MODEL_PHASE1 = RESEARCH_DIR / "best_resnet50_model.h5"
DEFAULT_MODEL_PHASE2 = RESEARCH_DIR / "best_resnet50_model_phase2.h5"


def resolve_dataset_dir() -> Path:
    """Vietnamese_Food_Dataset with class subfolders (pho/, com_tam/, …)."""
    candidates = (
        RESEARCH_DIR / "Vietnamese_Food_Dataset" / "Vietnamese_Food_Dataset",
        RESEARCH_DIR / "Vietnamese_Food_Dataset",
    )
    for path in candidates:
        if path.is_dir():
            return path
    return candidates[0]


DEFAULT_DATASET = resolve_dataset_dir()
