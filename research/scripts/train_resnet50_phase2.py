#!/usr/bin/env python3
"""Phase 2: ResNet50 + Bohlol FC head, fine-tune on Vietnamese_Food_Dataset (10 class).

Usage (Python 3.10–3.12 + TF in research/ai-service/.venv):
  research\\ai-service\\.venv\\Scripts\\python.exe research\\scripts\\train_resnet50_phase2.py --build-bohlol
  research\\ai-service\\.venv\\Scripts\\python.exe research\\scripts\\train_resnet50_phase2.py --build-bohlol --quick

Hyperparameters (Bohlol 2025): Adam lr=1e-4, batch=4, augmentation per paper.
Output: research/best_resnet50_unified.h5, research/output/reports/resnet50_train_report_{profile}.json
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from repo_paths import (
    CHECKPOINT_DIR,
    DEFAULT_DATASET,
    DEFAULT_MODEL,
    DEFAULT_MODEL_PHASE1,
    DEFAULT_MODEL_UNIFIED,
    OUTPUT_LOGS,
    OUTPUT_REPORTS,
    REPO_ROOT,
    ensure_output_dirs,
    resolve_dataset_for_profile,
)

AI_SERVICE = REPO_ROOT / "research" / "ai-service"
sys.path.insert(0, str(AI_SERVICE))

from class_manifest import (  # noqa: E402
    class_names,
    dataset_hint,
    default_model_filename,
    load_manifest,
    model_version as manifest_model_version,
)
from dataset_collect import collect_for_manifest  # noqa: E402
from main import safe_preprocess  # noqa: E402
from model_builder import (  # noqa: E402
    build_resnet50_bohlol,
    compile_bohlol,
    set_resnet_trainable,
)

DEFAULT_BASE_MODEL = DEFAULT_MODEL_PHASE1
OUTPUT_MODEL = DEFAULT_MODEL_UNIFIED
FOCUS_CLASSES = ("com_tam", "pho")
BOHLOL_LR = 1e-4
BOHLOL_BATCH = 4


def _repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve()))
    except ValueError:
        return str(path)


def _normalize_folder(name: str) -> str:
    import re

    s = name.strip().lower()
    s = re.sub(r"[\s\-]+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return s


def collect_images(dataset_dir: Path, class_labels: list[str]) -> list[tuple[Path, int]]:
    rows: list[tuple[Path, int]] = []
    folder_map: dict[str, Path] = {}
    if dataset_dir.is_dir():
        for p in dataset_dir.iterdir():
            if p.is_dir():
                folder_map[_normalize_folder(p.name)] = p
    for idx, class_name in enumerate(class_labels):
        class_dir = folder_map.get(class_name) or (dataset_dir / class_name)
        if not class_dir.is_dir():
            print(f"[WARN] Missing class folder: {class_name} under {dataset_dir}")
            continue
        for img_path in sorted(class_dir.iterdir()):
            if img_path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                rows.append((img_path, idx))
    return rows


def stratified_split(rows, val_ratio: float, seed: int, n_classes: int):
    rng = np.random.default_rng(seed)
    by_class: dict[int, list] = {i: [] for i in range(n_classes)}
    for row in rows:
        by_class[row[1]].append(row)
    train, val = [], []
    for class_idx in range(n_classes):
        items = by_class[class_idx]
        if not items:
            continue
        rng.shuffle(items)
        n_val = max(1, int(round(len(items) * val_ratio)))
        val.extend(items[:n_val])
        train.extend(items[n_val:])
    rng.shuffle(train)
    rng.shuffle(val)
    return train, val


def oversample_focus(
    train_rows, class_labels: list[str], extra_copies: int = 1
) -> list[tuple[Path, int]]:
    focus_idx = {class_labels.index(c) for c in FOCUS_CLASSES if c in class_labels}
    extra = [row for row in train_rows if row[1] in focus_idx]
    out = list(train_rows)
    for _ in range(extra_copies):
        out.extend(extra)
    rng = np.random.default_rng(42)
    rng.shuffle(out)
    return out


def class_weights(train_rows, class_labels: list[str], focus_weight: float) -> dict[int, float]:
    counts = Counter(label for _, label in train_rows)
    total = sum(counts.values())
    n_classes = len(class_labels)
    weights = {}
    for idx, name in enumerate(class_labels):
        c = counts.get(idx, 1)
        w = total / (n_classes * c)
        if name in FOCUS_CLASSES:
            w *= focus_weight
        weights[idx] = float(w)
    return weights


def load_base_model(path: Path):
    import tensorflow as tf

    if not path.exists():
        raise FileNotFoundError(f"Base model not found: {path}")
    return tf.keras.models.load_model(
        str(path),
        custom_objects={
            "preprocess_input": safe_preprocess,
            "safe_preprocess": safe_preprocess,
            "<lambda>": safe_preprocess,
        },
    )


def _valid_checkpoint(path: Path, min_bytes: int = 1_000_000) -> bool:
    return path.is_file() and path.stat().st_size >= min_bytes


def load_resume_model(path: Path, num_classes: int):
    """Load full .h5 or weights-only checkpoint into Bohlol architecture."""
    if not _valid_checkpoint(path, min_bytes=1024):
        raise FileNotFoundError(f"Resume checkpoint missing or corrupt: {path}")

    name = path.name.lower()
    if name.endswith(".weights.h5") or ".weights." in name:
        print(f"Loading weights into fresh ResNet50 head ({num_classes} classes)...", flush=True)
        model = build_resnet50_bohlol(num_classes=num_classes)
        model.load_weights(str(path))
        return model

    # Full model files for resnet50 are typically 90MB+; tiny files are failed saves.
    if path.stat().st_size < 50_000_000:
        raise FileNotFoundError(f"Resume file too small (likely corrupt save): {path}")

    return load_base_model(path)


def save_full_model_safe(model, path: Path) -> None:
    """Write deployable .h5 once at end; use temp file to avoid partial writes."""
    import gc

    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp.h5")
    print(f"Saving deployable model -> {path} ...", flush=True)
    gc.collect()
    model.save(str(tmp))
    size_mb = tmp.stat().st_size / (1024 * 1024)
    if size_mb < 50:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"Model save failed (only {size_mb:.1f} MB written)")
    if path.exists():
        path.unlink()
    tmp.rename(path)
    print(f"Saved: {path} ({size_mb:.1f} MB)", flush=True)


def train_state_path(profile: str) -> Path:
    return CHECKPOINT_DIR / profile / "train_state.json"


def save_train_state(profile: str, payload: dict) -> None:
    path = train_state_path(profile)
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {
        **payload,
        "profile": profile,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def load_train_state(profile: str) -> dict | None:
    path = train_state_path(profile)
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def clear_train_state(profile: str) -> None:
    path = train_state_path(profile)
    if path.is_file():
        path.unlink()


def _max_epoch_from_checkpoints(ckpt_dir: Path, stage: str) -> int:
    """Highest epoch index from head_epoch_XX.weights.h5 (matches Keras {epoch} in filename)."""
    best = -1
    for p in ckpt_dir.glob(f"{stage}_epoch_*.weights.h5"):
        suffix = p.stem.split("_epoch_", 1)[-1]
        try:
            best = max(best, int(suffix))
        except ValueError:
            continue
    return best


def infer_train_state(profile: str, epochs_head: int, epochs_finetune: int) -> dict | None:
    """Rebuild resume point from checkpoint files when train_state.json is missing."""
    ckpt_dir = CHECKPOINT_DIR / profile
    best = ckpt_dir / "best.weights.h5"
    if not _valid_checkpoint(best, min_bytes=1024):
        return None

    head_done = _max_epoch_from_checkpoints(ckpt_dir, "head")
    finetune_done = _max_epoch_from_checkpoints(ckpt_dir, "finetune")

    # Filenames head_epoch_01 … match completed epoch (1-indexed). Next Keras initial_epoch equals that index.
    if head_done >= epochs_head:
        if finetune_done >= epochs_finetune:
            return {"stage": "done", "weights_path": str(best)}
        if finetune_done > 0:
            return {
                "stage": "finetune",
                "initial_epoch": finetune_done,
                "epochs_completed_finetune": finetune_done,
                "weights_path": str(best),
            }
        return {
            "stage": "finetune",
            "initial_epoch": 0,
            "epochs_completed_head": epochs_head,
            "weights_path": str(best),
        }

    if head_done > 0:
        return {
            "stage": "head",
            "initial_epoch": head_done,
            "epochs_completed_head": head_done,
            "weights_path": str(best),
        }
    return None


def resolve_resume_plan(
    profile: str,
    epochs_head: int,
    epochs_finetune: int,
    *,
    fresh: bool,
    resume_stage: str | None,
    initial_epoch: int | None,
    resume_weights: Path | None,
) -> dict:
    """Return stage, initial_epoch per stage, and weights path for pause/resume."""
    if fresh:
        clear_train_state(profile)
        return {
            "stage": "head",
            "initial_epoch_head": 0,
            "initial_epoch_finetune": 0,
            "weights_path": resume_weights,
        }

    state = load_train_state(profile) or infer_train_state(profile, epochs_head, epochs_finetune)

    if resume_stage is not None or initial_epoch is not None:
        stage = resume_stage or (state or {}).get("stage", "head")
        ie = initial_epoch if initial_epoch is not None else (state or {}).get("initial_epoch", 0)
        weights = resume_weights or Path((state or {}).get("weights_path", ""))
        if stage == "finetune":
            return {
                "stage": "finetune",
                "initial_epoch_head": epochs_head,
                "initial_epoch_finetune": ie,
                "weights_path": weights if weights.exists() else resume_weights,
            }
        return {
            "stage": "head",
            "initial_epoch_head": ie,
            "initial_epoch_finetune": 0,
            "weights_path": weights if weights and weights.exists() else resume_weights,
        }

    if not state:
        return {
            "stage": "head",
            "initial_epoch_head": 0,
            "initial_epoch_finetune": 0,
            "weights_path": resume_weights,
        }

    if state.get("stage") == "done":
        return {**state, "stage": "done"}

    stage = state.get("stage", "head")
    ie = int(state.get("initial_epoch", 0))
    weights = resume_weights or Path(state.get("weights_path", ""))

    if stage == "finetune":
        return {
            "stage": "finetune",
            "initial_epoch_head": epochs_head,
            "initial_epoch_finetune": ie,
            "weights_path": weights,
        }
    return {
        "stage": "head",
        "initial_epoch_head": ie,
        "initial_epoch_finetune": 0,
        "weights_path": weights,
    }


def load_rgb_image(path: Path):
    """Load and resize; return None if file is corrupt (avoids mid-epoch hangs)."""
    from PIL import Image

    try:
        with Image.open(path) as im:
            return im.convert("RGB").resize((224, 224))
    except Exception as exc:
        print(f"[WARN] skip bad image {path}: {exc}", flush=True)
        return None


def augment_image(img, rng):
    """Bohlol augmentation: flip H/V, rotate ±15°, zoom ±20%, shear ±10%, brightness ±25%."""
    from PIL import Image, ImageEnhance

    if rng.random() > 0.5:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if rng.random() > 0.5:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
    angle = float(rng.uniform(-15, 15))
    img = img.rotate(angle, resample=Image.BILINEAR)
    # Zoom ±20% via center crop + resize
    w, h = img.size
    scale = float(rng.uniform(0.8, 1.2))
    nw, nh = max(1, int(w / scale)), max(1, int(h / scale))
    left = (w - nw) // 2
    top = (h - nh) // 2
    img = img.crop((left, top, left + nw, top + nh)).resize((w, h), Image.BILINEAR)
    # Shear ±10%
    shear = float(rng.uniform(-0.1, 0.1))
    img = img.transform(
        img.size,
        Image.AFFINE,
        (1, shear, 0, 0, 1, 0),
        resample=Image.BILINEAR,
    )
    brightness = float(rng.uniform(0.75, 1.25))
    img = ImageEnhance.Brightness(img).enhance(brightness)
    return img


def make_generators(train_rows, val_rows, batch_size: int, seed: int):
    import tensorflow as tf

    class PathBatchSequence(tf.keras.utils.Sequence):
        def __init__(self, rows, batch_size: int, shuffle: bool, augment: bool, seed: int):
            super().__init__()
            self.rows = list(rows)
            self.batch_size = batch_size
            self.shuffle = shuffle
            self.augment = augment
            self.rng = np.random.default_rng(seed)

        def __len__(self):
            return max(1, int(np.ceil(len(self.rows) / self.batch_size)))

        def on_epoch_end(self):
            if self.shuffle:
                self.rng.shuffle(self.rows)

        def _fill_batch(self, start_idx: int):
            xs, ys = [], []
            cursor = start_idx * self.batch_size
            attempts = 0
            max_attempts = max(self.batch_size * 4, len(self.rows))
            while len(xs) < self.batch_size and attempts < max_attempts:
                if not self.rows:
                    break
                path, label = self.rows[cursor % len(self.rows)]
                cursor += 1
                attempts += 1
                img = load_rgb_image(path)
                if img is None:
                    continue
                if self.augment:
                    img = augment_image(img, self.rng)
                xs.append(tf.keras.preprocessing.image.img_to_array(img))
                ys.append(label)
            if not xs:
                raise RuntimeError("Batch has no valid images — check dataset paths.")
            x = safe_preprocess(np.stack(xs, axis=0))
            return x, np.array(ys, dtype=np.int32)

        def __getitem__(self, idx):
            return self._fill_batch(idx)

    train_seq = PathBatchSequence(train_rows, batch_size, True, True, seed)
    val_seq = PathBatchSequence(val_rows, batch_size, False, False, seed + 1)
    return train_seq, val_seq, len(train_rows), len(val_rows)


def evaluate_all(
    model,
    val_rows,
    class_labels: list[str],
    batch_size: int = 32,
    max_samples: int | None = None,
) -> dict:
    """Val-set accuracy + macro F1 (batched; optional cap for large profiles)."""
    import tensorflow as tf

    rows = list(val_rows)
    if max_samples and len(rows) > max_samples:
        rng = np.random.default_rng(42)
        idx = rng.choice(len(rows), size=max_samples, replace=False)
        rows = [rows[int(i)] for i in idx]

    y_true, y_pred = [], []
    batch_x, batch_y = [], []
    for path, label in rows:
        img = load_rgb_image(path)
        if img is None:
            continue
        batch_x.append(tf.keras.preprocessing.image.img_to_array(img))
        batch_y.append(label)
        if len(batch_x) < batch_size:
            continue
        arr = safe_preprocess(np.stack(batch_x, axis=0))
        probs = model.predict(arr, verbose=0)
        for prob, true_label in zip(probs, batch_y):
            y_true.append(true_label)
            y_pred.append(int(np.argmax(prob)))
        batch_x, batch_y = [], []

    if batch_x:
        arr = safe_preprocess(np.stack(batch_x, axis=0))
        probs = model.predict(arr, verbose=0)
        for prob, true_label in zip(probs, batch_y):
            y_true.append(true_label)
            y_pred.append(int(np.argmax(prob)))

    if not y_true:
        return {"samples": 0}

    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    per_class = {}
    for idx, name in enumerate(class_labels):
        cls_true = [i for i, t in enumerate(y_true) if t == idx]
        if not cls_true:
            continue
        tp = sum(1 for i in cls_true if y_pred[i] == idx)
        fp = sum(1 for i, p in enumerate(y_pred) if p == idx and y_true[i] != idx)
        fn = len(cls_true) - tp
        prec = tp / (tp + fp) if (tp + fp) else 0.0
        rec = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        per_class[name] = {
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "support": len(cls_true),
        }

    macro_f1 = float(np.mean([v["f1"] for v in per_class.values()])) if per_class else 0.0
    return {
        "samples": len(y_true),
        "accuracy": round(correct / len(y_true), 4),
        "macro_f1": round(macro_f1, 4),
        "per_class": per_class,
    }


def main():
    parser = argparse.ArgumentParser(description="Phase 2 ResNet50 Bohlol fine-tune")
    parser.add_argument(
        "--profile",
        choices=("resnet10", "resnet100", "resnet101", "resnet_unified"),
        default="resnet_unified",
        help="Class manifest profile (default resnet_unified = 199-class production)",
    )
    parser.add_argument("--dataset", type=Path, default=None)
    parser.add_argument("--base-model", type=Path, default=DEFAULT_BASE_MODEL)
    parser.add_argument("--output", type=Path, default=OUTPUT_MODEL)
    parser.add_argument(
        "--build-bohlol",
        action="store_true",
        help="Build fresh ResNet50+Bohlol FC head (ImageNet) instead of loading phase1 .h5",
    )
    parser.add_argument("--epochs-head", type=int, default=5, help="Epochs training FC head (ResNet frozen)")
    parser.add_argument("--epochs-finetune", type=int, default=5, help="Epochs fine-tuning ResNet layers")
    parser.add_argument("--batch-size", type=int, default=BOHLOL_BATCH)
    parser.add_argument("--learning-rate", type=float, default=BOHLOL_LR)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--focus-weight", type=float, default=2.0)
    parser.add_argument("--unfreeze-layers", type=int, default=40)
    parser.add_argument("--quick", action="store_true", help="2+2 epochs smoke run")
    parser.add_argument(
        "--max-per-class",
        type=int,
        default=None,
        help="Cap training images per class (faster iteration)",
    )
    parser.add_argument(
        "--max-val-steps",
        type=int,
        default=None,
        help="Cap validation batches per epoch (faster + avoids long silent val on CPU)",
    )
    parser.add_argument(
        "--eval-max-samples",
        type=int,
        default=None,
        help="Cap images for final evaluate_all report (default 3000 for 50+ classes)",
    )
    parser.add_argument(
        "--resume",
        type=Path,
        default=None,
        help="Resume from a saved .h5 checkpoint (skips build-bohlol)",
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Ignore train_state.json and start Stage 1 epoch 1 from scratch",
    )
    parser.add_argument(
        "--resume-stage",
        choices=("head", "finetune"),
        default=None,
        help="Override stage when resuming (default: read train_state.json)",
    )
    parser.add_argument(
        "--initial-epoch",
        type=int,
        default=None,
        help="0-indexed Keras initial_epoch for --resume-stage (default: from train_state.json)",
    )
    args = parser.parse_args()

    import tensorflow as tf

    profile = args.profile
    manifest = load_manifest(profile)
    class_labels = class_names(profile)
    dataset_dir = args.dataset or resolve_dataset_for_profile(dataset_hint(profile))
    output_model = args.output
    if output_model == DEFAULT_MODEL_UNIFIED and profile != "resnet_unified":
        output_model = REPO_ROOT / "research" / default_model_filename(profile)

    if args.quick:
        args.epochs_head = 2
        args.epochs_finetune = 2

    n_classes = len(class_labels)
    if args.max_val_steps is None and n_classes > 50:
        args.max_val_steps = 512
    if args.eval_max_samples is None and n_classes > 50:
        args.eval_max_samples = 3000

    rows = collect_for_manifest(class_labels, manifest, dataset_dir)
    if not rows:
        print(f"No images under {dataset_dir}")
        sys.exit(1)

    if args.max_per_class:
        rng_cap = np.random.default_rng(args.seed)
        by_class: dict[int, list] = {i: [] for i in range(len(class_labels))}
        for row in rows:
            by_class[row[1]].append(row)
        capped = []
        for class_idx, items in by_class.items():
            rng_cap.shuffle(items)
            capped.extend(items[: args.max_per_class])
        rows = capped
        print(f"Capped to {args.max_per_class} images/class -> {len(rows)} total")

    train_rows, val_rows = stratified_split(rows, args.val_ratio, args.seed, len(class_labels))
    train_rows = oversample_focus(train_rows, class_labels, extra_copies=1 if args.quick else 2)
    weights = class_weights(train_rows, class_labels, args.focus_weight)
    print(f"Profile: {profile} ({len(class_labels)} classes)")
    print(f"Dataset: {dataset_dir}")
    print(f"Images: {len(rows)} | train: {len(train_rows)} | val: {len(val_rows)}", flush=True)

    ensure_output_dirs()
    checkpoint_dir = CHECKPOINT_DIR / profile
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    best_weights = checkpoint_dir / "best.weights.h5"
    progress_log = OUTPUT_LOGS / f"train_progress_{profile}.log"

    resume_weights = args.resume
    if resume_weights is None and _valid_checkpoint(best_weights, min_bytes=1024):
        resume_weights = best_weights

    plan = resolve_resume_plan(
        profile,
        args.epochs_head,
        args.epochs_finetune,
        fresh=args.fresh,
        resume_stage=args.resume_stage,
        initial_epoch=args.initial_epoch,
        resume_weights=resume_weights,
    )

    if plan.get("stage") == "done":
        print("Training already marked complete for this profile.", flush=True)
        if resume_weights and _valid_checkpoint(resume_weights, min_bytes=1024):
            model = load_resume_model(resume_weights, len(class_labels))
            save_full_model_safe(model, output_model)
        sys.exit(0)

    start_stage = plan["stage"]
    initial_epoch_head = int(plan.get("initial_epoch_head", 0))
    initial_epoch_finetune = int(plan.get("initial_epoch_finetune", 0))
    weights_path = plan.get("weights_path")

    if weights_path and Path(weights_path).exists() and _valid_checkpoint(Path(weights_path), min_bytes=1024):
        print(f"Resuming weights: {weights_path}", flush=True)
        model = load_resume_model(Path(weights_path), len(class_labels))
        baseline_eval = None
    elif args.build_bohlol:
        print("Building ResNet50 + Bohlol FC head (ImageNet weights)...", flush=True)
        model = build_resnet50_bohlol(num_classes=len(class_labels))
        baseline_eval = None
    else:
        model = load_base_model(args.base_model)
        baseline_eval = evaluate_all(
            model, val_rows, class_labels, args.batch_size, args.eval_max_samples
        )
        print(f"Baseline val: {baseline_eval}", flush=True)

    if start_stage == "head":
        print(
            f"Resume plan: Stage 1 epoch {initial_epoch_head + 1}/{args.epochs_head} "
            f"(initial_epoch={initial_epoch_head})",
            flush=True,
        )
    else:
        print(
            f"Resume plan: Stage 2 epoch {initial_epoch_finetune + 1}/{args.epochs_finetune} "
            f"(initial_epoch={initial_epoch_finetune}) — Stage 1 skipped",
            flush=True,
        )

    train_flow, val_flow, n_train, n_val = make_generators(
        train_rows, val_rows, args.batch_size, args.seed
    )
    steps_train = max(1, int(np.ceil(n_train / args.batch_size)))
    steps_val = max(1, int(np.ceil(n_val / args.batch_size)))
    if args.max_val_steps:
        steps_val = min(steps_val, args.max_val_steps)
    print(
        f"Steps/epoch: train={steps_train} val={steps_val} (cap={args.max_val_steps})",
        flush=True,
    )

    class TrainStateSaver(tf.keras.callbacks.Callback):
        def __init__(self, stage: str, epochs_in_stage: int):
            super().__init__()
            self.stage = stage
            self.epochs_in_stage = epochs_in_stage

        def on_epoch_end(self, epoch, logs=None):
            logs = logs or {}
            next_initial = epoch + 1
            payload: dict = {
                "stage": self.stage,
                "initial_epoch": next_initial,
                "last_val_accuracy": float(logs["val_accuracy"]) if logs.get("val_accuracy") is not None else None,
                "weights_path": str(best_weights),
            }
            if self.stage == "head":
                payload["epochs_completed_head"] = epoch + 1
            else:
                payload["epochs_completed_finetune"] = epoch + 1
            if next_initial >= self.epochs_in_stage:
                payload["stage"] = "finetune" if self.stage == "head" else "done"
                payload["initial_epoch"] = 0 if self.stage == "head" else next_initial
            save_train_state(profile, payload)

    class ProgressLogger(tf.keras.callbacks.Callback):
        def __init__(self, stage: str):
            super().__init__()
            self.stage = stage

        def on_epoch_end(self, epoch, logs=None):
            logs = logs or {}
            line = (
                f"{datetime.now(timezone.utc).isoformat()} stage={self.stage} "
                f"epoch={epoch + 1} loss={logs.get('loss')} "
                f"acc={logs.get('accuracy')} val_loss={logs.get('val_loss')} "
                f"val_acc={logs.get('val_accuracy')}\n"
            )
            with progress_log.open("a", encoding="utf-8") as fh:
                fh.write(line)
            print(line.strip(), flush=True)

    def build_callbacks(stage: str, epochs_in_stage: int):
        return [
            ProgressLogger(stage),
            TrainStateSaver(stage, epochs_in_stage),
            tf.keras.callbacks.ModelCheckpoint(
                str(best_weights),
                monitor="val_accuracy",
                save_best_only=True,
                save_weights_only=True,
                mode="max",
                verbose=1,
            ),
            tf.keras.callbacks.ModelCheckpoint(
                str(checkpoint_dir / f"{stage}_epoch_{{epoch:02d}}.weights.h5"),
                save_best_only=False,
                save_weights_only=True,
                verbose=0,
            ),
            tf.keras.callbacks.EarlyStopping(
                monitor="val_accuracy", patience=3, restore_best_weights=True, mode="max"
            ),
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=2, min_lr=1e-6
            ),
        ]

    history = None

    if start_stage == "head" and initial_epoch_head < args.epochs_head:
        set_resnet_trainable(model, trainable=False)
        compile_bohlol(model, learning_rate=args.learning_rate)
        print(
            f"\n=== Stage 1: FC head only (lr={args.learning_rate}, batch={args.batch_size}) "
            f"| epoch {initial_epoch_head + 1}/{args.epochs_head} -> {args.epochs_head} ===",
            flush=True,
        )
        model.fit(
            train_flow,
            validation_data=val_flow,
            epochs=args.epochs_head,
            initial_epoch=initial_epoch_head,
            steps_per_epoch=steps_train,
            validation_steps=steps_val,
            class_weight=weights,
            callbacks=build_callbacks("head", args.epochs_head),
            verbose=1,
        )
        save_train_state(
            profile,
            {
                "stage": "finetune",
                "initial_epoch": 0,
                "epochs_completed_head": args.epochs_head,
                "weights_path": str(best_weights),
            },
        )
    elif start_stage == "head":
        print("\n=== Stage 1: already complete — skipping ===", flush=True)

    if initial_epoch_finetune < args.epochs_finetune:
        set_resnet_trainable(model, trainable=True, unfreeze_last_n=args.unfreeze_layers)
        compile_bohlol(model, learning_rate=args.learning_rate * 0.1)
        print(
            f"\n=== Stage 2: fine-tune last {args.unfreeze_layers} layers "
            f"| epoch {initial_epoch_finetune + 1}/{args.epochs_finetune} -> {args.epochs_finetune} ===",
            flush=True,
        )
        history = model.fit(
            train_flow,
            validation_data=val_flow,
            epochs=args.epochs_finetune,
            initial_epoch=initial_epoch_finetune,
            steps_per_epoch=steps_train,
            validation_steps=steps_val,
            class_weight=weights,
            callbacks=build_callbacks("finetune", args.epochs_finetune),
            verbose=1,
        )
        clear_train_state(profile)
    else:
        print("\n=== Stage 2: already complete — skipping ===", flush=True)

    output_model.parent.mkdir(parents=True, exist_ok=True)
    save_full_model_safe(model, output_model)

    after_eval = evaluate_all(
        model, val_rows, class_labels, args.batch_size, args.eval_max_samples
    )
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "profile": profile,
        "modelVersion": manifest_model_version(profile),
        "numClasses": len(class_labels),
        "architecture": "resnet50_bohlol" if args.build_bohlol else "phase1_finetune",
        "bohlol_reference": {
            "no_fc_accuracy": "~70%",
            "resnet50s_accuracy": "97.25%",
            "resnet50s_f1": "97%",
        },
        "hyperparameters": {
            "optimizer": "Adam",
            "learning_rate": args.learning_rate,
            "batch_size": args.batch_size,
            "epochs_head": args.epochs_head,
            "epochs_finetune": args.epochs_finetune,
            "max_val_steps": args.max_val_steps,
            "eval_max_samples": args.eval_max_samples,
        },
        "dataset": _repo_relative(dataset_dir),
        "base_model": None if args.build_bohlol else _repo_relative(args.base_model),
        "output_model": _repo_relative(output_model),
        "train_size": len(train_rows),
        "val_size": len(val_rows),
        "baseline_eval": baseline_eval,
        "after_eval": after_eval,
        "final_val_accuracy": (
            float(history.history["val_accuracy"][-1]) if history and history.history.get("val_accuracy") else None
        ),
    }
    report_path = OUTPUT_REPORTS / f"resnet50_train_report_{profile}.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Report: {report_path}")
    print(json.dumps(report, indent=2))

    if not args.build_bohlol and output_model.exists() and args.base_model.exists():
        backup = args.base_model.with_name(args.base_model.stem + "_phase1_backup.h5")
        if not backup.exists():
            shutil.copy2(args.base_model, backup)
            print(f"Backed up phase1 model -> {backup}")


if __name__ == "__main__":
    main()
