#!/usr/bin/env python3
"""Phase 2: fine-tune ResNet50 on Vietnamese_Food_Dataset with focus on com_tam & pho.

Usage (from repo root, Python 3.10–3.12 + TF in research/ai-service/.venv):
  research\\ai-service\\.venv\\Scripts\\python.exe research\\scripts\\train_resnet50_phase2.py
  research\\ai-service\\.venv\\Scripts\\python.exe research\\scripts\\train_resnet50_phase2.py --epochs 15 --focus-weight 2.0

Output:
  research/best_resnet50_model_phase2.h5  (new model — keep phase1 as backup)
  research/output/resnet50_phase2_report.json
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

REPO_ROOT = Path(__file__).resolve().parents[2]
AI_SERVICE = REPO_ROOT / "research" / "ai-service"
sys.path.insert(0, str(AI_SERVICE))

from main import CLASS_NAMES, safe_preprocess  # noqa: E402

DEFAULT_DATASET = Path(
    r"d:\FPT\SU26\SBA\project_team\research\Vietnamese_Food_Dataset\Vietnamese_Food_Dataset"
)
DEFAULT_BASE_MODEL = Path(
    r"d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5"
)
OUTPUT_MODEL = Path(
    r"d:\FPT\SU26\SBA\project_team\research\best_resnet50_model_phase2.h5"
)
OUTPUT_DIR = REPO_ROOT / "research" / "output"
FOCUS_CLASSES = ("com_tam", "pho")


def collect_images(dataset_dir: Path) -> list[tuple[Path, int]]:
    rows: list[tuple[Path, int]] = []
    for idx, class_name in enumerate(CLASS_NAMES):
        class_dir = dataset_dir / class_name
        if not class_dir.is_dir():
            print(f"[WARN] Missing class folder: {class_dir}")
            continue
        for img_path in sorted(class_dir.iterdir()):
            if img_path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                rows.append((img_path, idx))
    return rows


def stratified_split(rows, val_ratio: float, seed: int):
    rng = np.random.default_rng(seed)
    by_class: dict[int, list] = {i: [] for i in range(len(CLASS_NAMES))}
    for row in rows:
        by_class[row[1]].append(row)
    train, val = [], []
    for class_idx in range(len(CLASS_NAMES)):
        items = by_class[class_idx]
        rng.shuffle(items)
        n_val = max(1, int(round(len(items) * val_ratio)))
        val.extend(items[:n_val])
        train.extend(items[n_val:])
    rng.shuffle(train)
    rng.shuffle(val)
    return train, val


def oversample_focus(train_rows, extra_copies: int = 1) -> list[tuple[Path, int]]:
    """Duplicate com_tam/pho samples — com_tam baseline ~48% needs more weight."""
    focus_idx = {CLASS_NAMES.index(c) for c in FOCUS_CLASSES}
    extra = [row for row in train_rows if row[1] in focus_idx]
    out = list(train_rows)
    for _ in range(extra_copies):
        out.extend(extra)
    rng = np.random.default_rng(42)
    rng.shuffle(out)
    return out


def class_weights(train_rows, focus_weight: float) -> dict[int, float]:
    counts = Counter(label for _, label in train_rows)
    total = sum(counts.values())
    n_classes = len(CLASS_NAMES)
    weights = {}
    for idx, name in enumerate(CLASS_NAMES):
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
            "<lambda>": safe_preprocess,
        },
    )


def set_resnet_trainable(model, trainable: bool, unfreeze_last_n: int = 0):
    for layer in model.layers:
        if layer.name == "resnet50":
            layer.trainable = trainable
            if trainable and unfreeze_last_n > 0 and hasattr(layer, "layers"):
                for sub in layer.layers:
                    sub.trainable = False
                for sub in layer.layers[-unfreeze_last_n:]:
                    sub.trainable = True
            return
    raise RuntimeError("resnet50 layer not found in model")


def make_generators(train_rows, val_rows, batch_size: int, seed: int):
    import tensorflow as tf

    class PathBatchSequence(tf.keras.utils.Sequence):
        def __init__(self, rows, batch_size: int, shuffle: bool, augment: bool, seed: int):
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

        def __getitem__(self, idx):
            from PIL import Image, ImageEnhance

            batch = self.rows[idx * self.batch_size : (idx + 1) * self.batch_size]
            xs, ys = [], []
            for path, label in batch:
                img = Image.open(path).convert("RGB").resize((224, 224))
                if self.augment:
                    if self.rng.random() > 0.5:
                        img = img.transpose(Image.FLIP_LEFT_RIGHT)
                    angle = float(self.rng.uniform(-15, 15))
                    img = img.rotate(angle, resample=Image.BILINEAR)
                    factor = float(self.rng.uniform(0.85, 1.15))
                    img = ImageEnhance.Brightness(img).enhance(factor)
                arr = tf.keras.preprocessing.image.img_to_array(img)
                xs.append(arr)
                ys.append(label)
            x = safe_preprocess(np.stack(xs, axis=0))
            return x, np.array(ys, dtype=np.int32)

    train_seq = PathBatchSequence(train_rows, batch_size, True, True, seed)
    val_seq = PathBatchSequence(val_rows, batch_size, False, False, seed + 1)
    return train_seq, val_seq, len(train_rows), len(val_rows)


def evaluate_focus(model, val_rows, batch_size: int = 32) -> dict:
    import tensorflow as tf
    from PIL import Image

    focus_idx = {CLASS_NAMES.index(c) for c in FOCUS_CLASSES}
    y_true, y_pred = [], []

    for path, label in val_rows:
        if label not in focus_idx:
            continue
        image = Image.open(path).convert("RGB").resize((224, 224))
        arr = tf.keras.preprocessing.image.img_to_array(image)
        arr = np.expand_dims(arr, 0)
        arr = safe_preprocess(arr)
        scores = tf.nn.softmax(model.predict(arr, verbose=0)[0]).numpy()
        y_true.append(label)
        y_pred.append(int(np.argmax(scores)))

    if not y_true:
        return {"samples": 0}

    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    per_class = {}
    for c in FOCUS_CLASSES:
        idx = CLASS_NAMES.index(c)
        cls_true = [i for i, t in enumerate(y_true) if t == idx]
        if cls_true:
            cls_correct = sum(1 for i in cls_true if y_pred[i] == idx)
            per_class[c] = {
                "accuracy": round(cls_correct / len(cls_true), 4),
                "support": len(cls_true),
            }

    return {
        "samples": len(y_true),
        "accuracy": round(correct / len(y_true), 4),
        "per_class": per_class,
    }


def main():
    parser = argparse.ArgumentParser(description="Phase 2 ResNet50 fine-tune (com_tam/pho focus)")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--base-model", type=Path, default=DEFAULT_BASE_MODEL)
    parser.add_argument("--output", type=Path, default=OUTPUT_MODEL)
    parser.add_argument("--epochs-head", type=int, default=3, help="Epochs training classifier head only")
    parser.add_argument("--epochs-finetune", type=int, default=12, help="Epochs fine-tuning last ResNet blocks")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--focus-weight", type=float, default=2.5,
                        help="Extra class-weight multiplier for com_tam & pho")
    parser.add_argument("--unfreeze-layers", type=int, default=40)
    parser.add_argument("--quick", action="store_true", help="2+3 epochs smoke run")
    args = parser.parse_args()

    import tensorflow as tf

    if args.quick:
        args.epochs_head = 2
        args.epochs_finetune = 3

    rows = collect_images(args.dataset)
    if not rows:
        print(f"No images under {args.dataset}")
        sys.exit(1)

    train_rows, val_rows = stratified_split(rows, args.val_ratio, args.seed)
    train_rows = oversample_focus(train_rows, extra_copies=2 if not args.quick else 1)
    weights = class_weights(train_rows, args.focus_weight)
    print(f"Images: {len(rows)} | train: {len(train_rows)} | val: {len(val_rows)}")
    print(f"Focus class weights: com_tam={weights[CLASS_NAMES.index('com_tam')]:.3f}, "
          f"pho={weights[CLASS_NAMES.index('pho')]:.3f}")

    model = load_base_model(args.base_model)
    baseline_focus = evaluate_focus(model, val_rows, args.batch_size)
    print(f"Baseline focus accuracy (com_tam+pho val): {baseline_focus}")

    train_flow, val_flow, n_train, n_val = make_generators(
        train_rows, val_rows, args.batch_size, args.seed
    )
    steps_train = max(1, int(np.ceil(n_train / args.batch_size)))
    steps_val = max(1, int(np.ceil(n_val / args.batch_size)))

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=4, restore_best_weights=True, mode="max"
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=2, min_lr=1e-6
        ),
    ]

    # Stage 1: head only
    set_resnet_trainable(model, trainable=False)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    print("\n=== Stage 1: train classifier head (ResNet frozen) ===")
    model.fit(
        train_flow,
        validation_data=val_flow,
        epochs=args.epochs_head,
        steps_per_epoch=steps_train,
        validation_steps=steps_val,
        class_weight=weights,
        callbacks=callbacks,
        verbose=1,
    )

    # Stage 2: fine-tune last ResNet blocks
    set_resnet_trainable(model, trainable=True, unfreeze_last_n=args.unfreeze_layers)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    print(f"\n=== Stage 2: fine-tune last {args.unfreeze_layers} ResNet layers ===")
    history = model.fit(
        train_flow,
        validation_data=val_flow,
        epochs=args.epochs_finetune,
        steps_per_epoch=steps_train,
        validation_steps=steps_val,
        class_weight=weights,
        callbacks=callbacks,
        verbose=1,
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    model.save(str(args.output))
    print(f"\nSaved: {args.output}")

    after_focus = evaluate_focus(model, val_rows, args.batch_size)
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset": str(args.dataset),
        "base_model": str(args.base_model),
        "output_model": str(args.output),
        "train_size": len(train_rows),
        "val_size": len(val_rows),
        "focus_classes": list(FOCUS_CLASSES),
        "focus_weight": args.focus_weight,
        "baseline_focus": baseline_focus,
        "after_focus": after_focus,
        "final_val_accuracy": float(history.history["val_accuracy"][-1]),
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = OUTPUT_DIR / "resnet50_phase2_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Report: {report_path}")
    print(json.dumps(report, indent=2))

    # Optional backup copy instructions
    if args.output.exists() and args.base_model.exists():
        backup = args.base_model.with_name(args.base_model.stem + "_phase1_backup.h5")
        if not backup.exists():
            shutil.copy2(args.base_model, backup)
            print(f"Backed up phase1 model → {backup}")


if __name__ == "__main__":
    main()
