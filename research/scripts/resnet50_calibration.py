#!/usr/bin/env python3
"""RQ2: confidence calibration buckets for ResNet50 validation set."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

from repo_paths import OUTPUT_EVAL, REPO_ROOT

sys.path.insert(0, str(REPO_ROOT / "research" / "ai-service"))
sys.path.insert(0, str(REPO_ROOT / "research" / "scripts"))

from eval_resnet50 import (  # noqa: E402
    CLASS_NAMES,
    collect_images,
    load_model,
    predict_batch,
    stratified_split,
)
from repo_paths import DEFAULT_DATASET  # noqa: E402

OUTPUT = OUTPUT_EVAL / "resnet50_calibration.json"

BUCKETS = [(0.0, 0.25), (0.25, 0.35), (0.35, 0.50), (0.50, 1.01)]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rows = collect_images(args.dataset)
    _, val = stratified_split(rows, 0.2, args.seed)
    model = load_model()
    paths = [r[0] for r in val]
    y_true = [r[1] for r in val]
    probs = predict_batch(model, paths)
    pred_idx = np.argmax(probs, axis=1)
    conf = probs[np.arange(len(probs)), pred_idx]

    bucket_stats = []
    for low, high in BUCKETS:
        idxs = [i for i, c in enumerate(conf) if low <= c < high]
        if not idxs:
            bucket_stats.append({"range": f"[{low},{high})", "n": 0, "accuracy": None})
            continue
        acc = sum(1 for i in idxs if CLASS_NAMES[pred_idx[i]] == y_true[i]) / len(idxs)
        bucket_stats.append(
            {
                "range": f"[{low},{high})",
                "n": len(idxs),
                "accuracy": round(acc, 4),
                "avg_confidence_pct": round(float(np.mean(conf[idxs]) * 100), 2),
            }
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"buckets": bucket_stats}, indent=2), encoding="utf-8")
    print(json.dumps(bucket_stats, indent=2))
    print(f"Wrote {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
