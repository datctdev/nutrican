#!/usr/bin/env python3
"""Offline evaluation for ResNet50 on Vietnamese_Food_Dataset (80/20 stratified split)."""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np

from repo_paths import DEFAULT_DATASET, OUTPUT_DIR, REPO_ROOT

AI_SERVICE = REPO_ROOT / "research" / "ai-service"
sys.path.insert(0, str(AI_SERVICE))

from main import CLASS_NAMES, MODEL_PATH, safe_preprocess  # noqa: E402


def collect_images(dataset_dir: Path) -> list[tuple[Path, str]]:
    rows: list[tuple[Path, str]] = []
    for class_name in CLASS_NAMES:
        class_dir = dataset_dir / class_name
        if not class_dir.is_dir():
            continue
        for img_path in sorted(class_dir.iterdir()):
            if img_path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                rows.append((img_path, class_name))
    return rows


def stratified_split(
    rows: list[tuple[Path, str]], val_ratio: float, seed: int
) -> tuple[list[tuple[Path, str]], list[tuple[Path, str]]]:
    rng = np.random.default_rng(seed)
    by_class: dict[str, list[tuple[Path, str]]] = {c: [] for c in CLASS_NAMES}
    for row in rows:
        by_class[row[1]].append(row)
    train, val = [], []
    for class_name in CLASS_NAMES:
        items = by_class[class_name]
        rng.shuffle(items)
        n_val = max(1, int(round(len(items) * val_ratio)))
        val.extend(items[:n_val])
        train.extend(items[n_val:])
    return train, val


def load_model():
    import tensorflow as tf

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    return tf.keras.models.load_model(
        str(MODEL_PATH),
        custom_objects={
            "preprocess_input": safe_preprocess,
            "<lambda>": safe_preprocess,
        },
    )


def predict_batch(model, paths: list[Path], batch_size: int = 32) -> np.ndarray:
    import tensorflow as tf
    from PIL import Image

    preds: list[np.ndarray] = []
    batch_arrays: list[np.ndarray] = []
    for path in paths:
        image = Image.open(path).convert("RGB").resize((224, 224))
        arr = tf.keras.preprocessing.image.img_to_array(image)
        batch_arrays.append(arr)
        if len(batch_arrays) >= batch_size:
            x = np.stack(batch_arrays, axis=0)
            x = safe_preprocess(x)
            out = model.predict(x, verbose=0)
            preds.append(out)
            batch_arrays = []
    if batch_arrays:
        x = np.stack(batch_arrays, axis=0)
        x = safe_preprocess(x)
        out = model.predict(x, verbose=0)
        preds.append(out)
    return np.vstack(preds)


def evaluate(model, rows: list[tuple[Path, str]]) -> dict:
    paths = [r[0] for r in rows]
    y_true = [r[1] for r in rows]
    probs = predict_batch(model, paths)
    y_pred_idx = np.argmax(probs, axis=1)
    y_pred = [CLASS_NAMES[i] for i in y_pred_idx]
    confidences = probs[np.arange(len(probs)), y_pred_idx]

    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    top1 = correct / len(rows) if rows else 0.0

    top3 = 0
    for i, true_label in enumerate(y_true):
        top_idx = np.argsort(probs[i])[-3:][::-1]
        if true_label in {CLASS_NAMES[j] for j in top_idx}:
            top3 += 1
    top3_acc = top3 / len(rows) if rows else 0.0

    per_class: dict[str, dict] = {}
    for class_name in CLASS_NAMES:
        idxs = [i for i, t in enumerate(y_true) if t == class_name]
        if not idxs:
            continue
        cls_correct = sum(1 for i in idxs if y_pred[i] == class_name)
        per_class[class_name] = {
            "support": len(idxs),
            "accuracy": round(cls_correct / len(idxs), 4),
            "avg_confidence": round(float(np.mean(confidences[idxs])), 4),
        }

    confusion: dict[str, dict[str, int]] = {c: Counter() for c in CLASS_NAMES}
    for t, p in zip(y_true, y_pred):
        confusion[t][p] += 1

    return {
        "n_samples": len(rows),
        "top1_accuracy": round(top1, 4),
        "top3_accuracy": round(top3_acc, 4),
        "per_class": per_class,
        "confusion_matrix": {k: dict(v) for k, v in confusion.items()},
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--split", choices=("val", "all"), default="val")
    args = parser.parse_args()

    rows = collect_images(args.dataset)
    if not rows:
        print(f"No images under {args.dataset}")
        return 1

    train, val = stratified_split(rows, args.val_ratio, args.seed)
    eval_rows = val if args.split == "val" else rows

    print(f"Dataset images: {len(rows)} | train: {len(train)} | val: {len(val)}")
    model = load_model()
    metrics = evaluate(model, eval_rows)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_json = OUTPUT_DIR / "resnet50_eval.json"
    out_md = OUTPUT_DIR / "resnet50_eval.md"

    payload = {
        "dataset": str(args.dataset),
        "seed": args.seed,
        "val_ratio": args.val_ratio,
        "split": args.split,
        "train_size": len(train),
        "val_size": len(val),
        **metrics,
    }
    out_json.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        "# ResNet50 offline evaluation",
        "",
        f"- Dataset: `{args.dataset}`",
        f"- Split: {args.split} (seed={args.seed}, val_ratio={args.val_ratio})",
        f"- Samples evaluated: {metrics['n_samples']}",
        f"- Top-1 accuracy: **{metrics['top1_accuracy'] * 100:.2f}%**",
        f"- Top-3 accuracy: **{metrics['top3_accuracy'] * 100:.2f}%**",
        "",
        "## Per-class",
        "",
        "| Class | Support | Accuracy | Avg confidence |",
        "|-------|---------|----------|----------------|",
    ]
    for class_name, stats in metrics["per_class"].items():
        lines.append(
            f"| {class_name} | {stats['support']} | {stats['accuracy']*100:.1f}% | {stats['avg_confidence']*100:.1f}% |"
        )
    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Top-1: {metrics['top1_accuracy']*100:.2f}%")
    print(f"Wrote {out_json}")
    print(f"Wrote {out_md}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
