#!/usr/bin/env python3
"""Offline evaluation for ResNet50 on Vietnamese_Food_Dataset (80/20 stratified split)."""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np

from repo_paths import (
    DEFAULT_MODEL_PHASE1,
    DEFAULT_MODEL_UNIFIED,
    OUTPUT_EVAL,
    REPO_ROOT,
    ensure_output_dirs,
    resolve_dataset_for_profile,
)

AI_SERVICE = REPO_ROOT / "research" / "ai-service"
sys.path.insert(0, str(AI_SERVICE))

from class_manifest import class_names, dataset_hint, default_model_filename, load_manifest  # noqa: E402
from dataset_collect import collect_for_manifest, collect_single_dataset  # noqa: E402
from main import safe_preprocess  # noqa: E402


def collect_images(dataset_dir: Path, class_labels: list[str]) -> list[tuple[Path, str]]:
    import re

    def norm(name: str) -> str:
        s = name.strip().lower()
        s = re.sub(r"[\s\-]+", "_", s)
        return re.sub(r"[^a-z0-9_]", "", s)

    folder_map: dict[str, Path] = {}
    if dataset_dir.is_dir():
        for p in dataset_dir.iterdir():
            if p.is_dir():
                folder_map[norm(p.name)] = p
    rows: list[tuple[Path, str]] = []
    for class_name in class_labels:
        class_dir = folder_map.get(class_name) or (dataset_dir / class_name)
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
    by_class: dict[str, list[tuple[Path, str]]] = {}
    for row in rows:
        by_class.setdefault(row[1], []).append(row)
    train, val = [], []
    for class_name in sorted(by_class.keys()):
        items = by_class[class_name]
        rng.shuffle(items)
        n_val = max(1, int(round(len(items) * val_ratio)))
        val.extend(items[:n_val])
        train.extend(items[n_val:])
    return train, val


def load_model(model_path: Path):
    import tensorflow as tf

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    return tf.keras.models.load_model(
        str(model_path),
        custom_objects={
            "preprocess_input": safe_preprocess,
            "safe_preprocess": safe_preprocess,
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


def evaluate(model, rows: list[tuple[Path, str]], class_labels: list[str]) -> dict:
    paths = [r[0] for r in rows]
    y_true = [r[1] for r in rows]
    probs = predict_batch(model, paths)
    y_pred_idx = np.argmax(probs, axis=1)
    y_pred = [class_labels[i] for i in y_pred_idx]
    confidences = probs[np.arange(len(probs)), y_pred_idx]

    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    top1 = correct / len(rows) if rows else 0.0

    top3 = 0
    for i, true_label in enumerate(y_true):
        top_idx = np.argsort(probs[i])[-3:][::-1]
        if true_label in {class_labels[j] for j in top_idx}:
            top3 += 1
    top3_acc = top3 / len(rows) if rows else 0.0

    per_class: dict[str, dict] = {}
    for class_name in class_labels:
        idxs = [i for i, t in enumerate(y_true) if t == class_name]
        if not idxs:
            continue
        cls_correct = sum(1 for i in idxs if y_pred[i] == class_name)
        per_class[class_name] = {
            "support": len(idxs),
            "accuracy": round(cls_correct / len(idxs), 4),
            "avg_confidence": round(float(np.mean(confidences[idxs])), 4),
        }

    confusion: dict[str, dict[str, int]] = {c: Counter() for c in class_labels}
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
    parser.add_argument(
        "--profile",
        choices=("resnet10", "resnet100", "resnet101", "resnet_unified"),
        default="resnet_unified",
    )
    parser.add_argument("--dataset", type=Path, default=None)
    parser.add_argument("--model", type=Path, default=None)
    parser.add_argument("--tag", type=str, default="phase1", help="Output tag (phase1, phase2)")
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--split", choices=("val", "all"), default="val")
    parser.add_argument(
        "--compare",
        action="store_true",
        help="Eval phase1 and phase2; write resnet50_compare.json for Table 1b",
    )
    args = parser.parse_args()
    model_path = args.model or (REPO_ROOT / "research" / default_model_filename(args.profile))

    class_labels = class_names(args.profile)
    manifest = load_manifest(args.profile)
    dataset_dir = args.dataset or resolve_dataset_for_profile(dataset_hint(args.profile))

    if manifest.get("datasetSources") or manifest.get("dataset_sources"):
        int_rows = collect_for_manifest(class_labels, manifest, dataset_dir)
        rows = [(p, class_labels[i]) for p, i in int_rows]
    else:
        int_rows = collect_single_dataset(dataset_dir, class_labels)
        rows = [(p, class_labels[i]) for p, i in int_rows]
    if not rows:
        print(f"No images under {dataset_dir}")
        return 1

    train, val = stratified_split(rows, args.val_ratio, args.seed)
    eval_rows = val if args.split == "val" else rows

    print(f"Dataset images: {len(rows)} | train: {len(train)} | val: {len(val)}")

    def run_eval(model_path: Path, tag: str) -> dict:
        model = load_model(model_path)
        metrics = evaluate(model, eval_rows, class_labels)
        ensure_output_dirs()
        out_json = OUTPUT_EVAL / f"resnet50_eval_{tag}.json"
        out_md = OUTPUT_EVAL / f"resnet50_eval_{tag}.md"
        payload = {
            "model": str(model_path),
            "tag": tag,
            "dataset": str(dataset_dir),
            "profile": args.profile,
            "seed": args.seed,
            "val_ratio": args.val_ratio,
            "split": args.split,
            "train_size": len(train),
            "val_size": len(val),
            **metrics,
        }
        out_json.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        lines = [
            f"# ResNet50 offline evaluation ({tag})",
            "",
            f"- Model: `{model_path}`",
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
                f"| {class_name} | {stats['support']} | {stats['accuracy']*100:.1f}% | "
                f"{stats['avg_confidence']*100:.1f}% |"
            )
        out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"[{tag}] Top-1: {metrics['top1_accuracy']*100:.2f}% -> {out_json}")
        return payload

    if args.compare:
        results = {}
        for path, tag in ((DEFAULT_MODEL_PHASE1, "phase1"), (DEFAULT_MODEL_UNIFIED, "unified")):
            if path.exists():
                results[tag] = run_eval(path, tag)
            else:
                print(f"[{tag}] Skipped - model not found: {path}")
        compare_path = OUTPUT_EVAL / "resnet50_compare.json"
        compare_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"Wrote {compare_path}")
        return 0 if results else 1

    run_eval(model_path, args.tag)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
