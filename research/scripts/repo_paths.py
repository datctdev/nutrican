"""Portable paths relative to the nutrican git repository root."""
from __future__ import annotations

from pathlib import Path

# research/scripts/repo_paths.py -> parents[2] = nutrican/
REPO_ROOT = Path(__file__).resolve().parents[2]

RESEARCH_DIR = REPO_ROOT / "research"
DATA_DIR = RESEARCH_DIR / "data"
SEED_DIR = RESEARCH_DIR / "seed"

# Generated artifacts (regenerable; mostly gitignored)
OUTPUT_DIR = RESEARCH_DIR / "output"
OUTPUT_LOGS = OUTPUT_DIR / "logs"
OUTPUT_EVAL = OUTPUT_DIR / "eval"
OUTPUT_RBL = OUTPUT_DIR / "rbl"
OUTPUT_REPORTS = OUTPUT_DIR / "reports"
CHECKPOINT_DIR = OUTPUT_DIR / "checkpoints"

# Shared datasets live one level above nutrican repo (project_team/research/)
PROJECT_TEAM_RESEARCH = REPO_ROOT.parent / "research"

DEFAULT_PDF = PROJECT_TEAM_RESEARCH / "bang-luong-calo-trong-thuc-pham.pdf"
if not DEFAULT_PDF.exists():
    DEFAULT_PDF = RESEARCH_DIR / "bang-luong-calo-trong-thuc-pham.pdf"

NUTRITION_CSV = PROJECT_TEAM_RESEARCH / "nutrition.csv"
if not NUTRITION_CSV.exists():
    NUTRITION_CSV = DATA_DIR / "nutrition.csv"

# Production model — 199-class unified (includes VTN-10 core)
DEFAULT_MODEL = RESEARCH_DIR / "best_resnet50_unified.h5"
DEFAULT_MODEL_UNIFIED = DEFAULT_MODEL

# ImageNet base for transfer learning only (not served in production)
DEFAULT_MODEL_PHASE1 = RESEARCH_DIR / "best_resnet50_model.h5"
if not DEFAULT_MODEL_PHASE1.exists():
    DEFAULT_MODEL_PHASE1 = PROJECT_TEAM_RESEARCH / "best_resnet50_model.h5"

DEFAULT_CLASS_PROFILE = "resnet_unified"

# Dataset paths (prefer project_team/research, fallback in-repo)
VTN_10_DATASET = PROJECT_TEAM_RESEARCH / "Vietnamese_Food_Dataset" / "Vietnamese_Food_Dataset"
FOOD101_IMAGES = PROJECT_TEAM_RESEARCH / "food-101" / "food-101" / "images"
DISHES_100_IMAGES = PROJECT_TEAM_RESEARCH / "100 dishes" / "images"

DATASET_BY_KEY = {
    "VTN_10": VTN_10_DATASET,
    "DISHES_100": DISHES_100_IMAGES,
    "FOOD101": FOOD101_IMAGES,
    "UNIFIED": VTN_10_DATASET,
}

FOOD101_VTN_OVERLAP = {
    "pho": "pho",
    "spring_rolls": "goi_cuon",
}


def ensure_output_dirs() -> None:
    """Create artifact subfolders on demand."""
    for path in (OUTPUT_LOGS, OUTPUT_EVAL, OUTPUT_RBL, OUTPUT_REPORTS, CHECKPOINT_DIR):
        path.mkdir(parents=True, exist_ok=True)


def resolve_dataset_dir() -> Path:
    """Vietnamese_Food_Dataset with class subfolders (pho/, com_tam/, ...)."""
    candidates = (
        VTN_10_DATASET,
        PROJECT_TEAM_RESEARCH / "Vietnamese_Food_Dataset",
        RESEARCH_DIR / "Vietnamese_Food_Dataset" / "Vietnamese_Food_Dataset",
        RESEARCH_DIR / "Vietnamese_Food_Dataset",
    )
    for path in candidates:
        if path.is_dir() and any(path.iterdir()):
            return path
    return candidates[0]


def resolve_dataset_for_profile(dataset_key: str | None = None) -> Path:
    """Resolve dataset root from manifest datasetPathKey."""
    if dataset_key and dataset_key in DATASET_BY_KEY:
        path = DATASET_BY_KEY[dataset_key]
        if path.is_dir():
            return path
    return resolve_dataset_dir()


DEFAULT_DATASET = resolve_dataset_dir()
