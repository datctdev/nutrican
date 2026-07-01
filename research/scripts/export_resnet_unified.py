#!/usr/bin/env python3
"""Export deployable .h5 from weights-only checkpoint (post-training).

Builds Bohlol architecture without preloading ImageNet (checkpoint has full weights),
then writes research/best_resnet50_unified.h5 for ai-service load_model().
"""
from __future__ import annotations

import argparse
import gc
import sys
from pathlib import Path

from repo_paths import CHECKPOINT_DIR, DEFAULT_MODEL_UNIFIED, REPO_ROOT

AI_SERVICE = REPO_ROOT / "research" / "ai-service"
sys.path.insert(0, str(AI_SERVICE))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import tensorflow as tf  # noqa: E402
from class_manifest import class_names, load_manifest  # noqa: E402
from model_builder import HEAD_LAYER_NAMES  # noqa: E402
from train_resnet50_phase2 import save_full_model_safe  # noqa: E402


def build_bohlol_from_checkpoint(num_classes: int) -> tf.keras.Model:
    """Same head as training; backbone weights=None (filled by load_weights)."""
    from tensorflow.keras import layers, models
    from tensorflow.keras.applications import ResNet50

    backbone = ResNet50(
        include_top=False,
        weights=None,
        input_shape=(224, 224, 3),
        name="resnet50",
    )
    x = layers.GlobalAveragePooling2D(name="gap")(backbone.output)
    x = layers.Dense(512, activation="relu", name="fc_512")(x)
    x = layers.Dropout(0.2, name="dropout_fc")(x)
    x = layers.Dense(256, activation="relu", name="fc_256")(x)
    x = layers.Dense(128, activation="relu", name="fc_128")(x)
    x = layers.Dense(64, activation="relu", name="fc_64")(x)
    x = layers.Dense(32, activation="relu", name="fc_32")(x)
    x = layers.BatchNormalization(name="batch_norm_head")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)
    model = models.Model(inputs=backbone.input, outputs=outputs, name="resnet50_bohlol")
    model.backbone = backbone  # type: ignore[attr-defined]
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description="Export best.weights.h5 -> deployable .h5")
    parser.add_argument("--profile", default="resnet_unified")
    parser.add_argument(
        "--weights",
        type=Path,
        default=CHECKPOINT_DIR / "resnet_unified" / "best.weights.h5",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_MODEL_UNIFIED)
    args = parser.parse_args()

    weights = args.weights.resolve()
    output = args.output.resolve()
    if not weights.is_file() or weights.stat().st_size < 1_000_000:
        raise FileNotFoundError(f"Missing or corrupt weights: {weights}")

    load_manifest(args.profile)
    labels = class_names(args.profile)
    print(f"Profile: {args.profile} ({len(labels)} classes)", flush=True)
    print(f"Weights: {weights} ({weights.stat().st_size / (1024**2):.1f} MB)", flush=True)
    print(f"Output:  {output}", flush=True)

    tmp = output.with_suffix(".tmp.h5")
    tmp.unlink(missing_ok=True)

    gc.collect()
    model = build_bohlol_from_checkpoint(len(labels))
    print("Loading checkpoint weights...", flush=True)
    model.load_weights(str(weights))
    gc.collect()

    save_full_model_safe(model, output)

    del model
    gc.collect()

    print("Verifying load_model()...", flush=True)
    from main import model_custom_objects  # noqa: E402

    loaded = tf.keras.models.load_model(str(output), custom_objects=model_custom_objects())
    out_dim = loaded.output_shape[-1]
    if out_dim != len(labels):
        raise RuntimeError(f"Output dim {out_dim} != {len(labels)} classes")
    print(f"OK: {output.name} ({output.stat().st_size / (1024**2):.1f} MB, {out_dim} classes)", flush=True)


if __name__ == "__main__":
    main()
