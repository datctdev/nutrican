"""Nutrican ResNet50 food recognition API — Phase 1: top-3 + image-based portion_ratio."""
from __future__ import annotations

import io
import os
from pathlib import Path

import numpy as np
import tensorflow as tf
import uvicorn
from fastapi import FastAPI, File, UploadFile
from PIL import Image

from portion_estimator import estimate_portion_ratio
from class_manifest import (
    CLASS_NAMES,
    DISPLAY_NAMES,
    active_profile,
    default_model_filename,
    model_version as manifest_model_version,
)

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent.parent  # nutrican repo root
_profile = active_profile()
_default_model_name = default_model_filename(_profile)
DEFAULT_MODEL = PROJECT_ROOT / "research" / _default_model_name
MODEL_PATH = Path(os.environ.get("MODEL_PATH", str(DEFAULT_MODEL)))
MODEL_VERSION = os.environ.get("MODEL_VERSION", manifest_model_version(_profile))

CONFIDENCE_CONFIRM_THRESHOLD = 85.0
MARGIN_CONFIRM_THRESHOLD = 20.0
MULTI_CLASS_COUNT_THRESHOLD = 50
MULTI_CLASS_TOP_CONF_MIN = 8.0
MULTI_CLASS_MARGIN_MIN = 2.0


def safe_preprocess(x, **kwargs):
    return tf.keras.applications.resnet50.preprocess_input(x)


def build_top_predictions(scores: np.ndarray, limit: int = 3) -> list[dict]:
    top_indices = np.argsort(scores)[::-1][:limit]
    predictions = []
    for idx in top_indices:
        code = CLASS_NAMES[int(idx)]
        predictions.append(
            {
                "food_code": code,
                "food_name": DISPLAY_NAMES.get(code, code.replace("_", " ").title()),
                "confidence": round(float(scores[idx]) * 100, 2),
            }
        )
    return predictions


def needs_user_confirmation(top_predictions: list[dict], num_classes: int) -> bool:
    if not top_predictions:
        return True
    top_conf = top_predictions[0]["confidence"]
    margin = 0.0
    if len(top_predictions) > 1:
        margin = top_predictions[0]["confidence"] - top_predictions[1]["confidence"]

    if num_classes >= MULTI_CLASS_COUNT_THRESHOLD:
        if top_conf < MULTI_CLASS_TOP_CONF_MIN:
            return True
        if margin < MULTI_CLASS_MARGIN_MIN:
            return True
        return False

    if top_conf < CONFIDENCE_CONFIRM_THRESHOLD:
        return True
    if margin < MARGIN_CONFIRM_THRESHOLD:
        return True
    return False


app = FastAPI(title="Nutrican AI Snapshot API")
model: tf.keras.Model | None = None


def model_custom_objects() -> dict:
    """Match all Lambda/preprocess names used in phase1 and phase2 .h5 files."""
    return {
        "preprocess_input": safe_preprocess,
        "safe_preprocess": safe_preprocess,
        "<lambda>": safe_preprocess,
    }


@app.on_event("startup")
def load_model() -> None:
    global model
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    print(f"Loading model from {MODEL_PATH}...")
    try:
        model = tf.keras.models.load_model(
            str(MODEL_PATH),
            custom_objects=model_custom_objects(),
        )
    except Exception as e:
        print(f"Standard load_model failed: {e}")
        print("Rebuilding ResNet50 Bohlol architecture and loading weights instead...")
        
        from tensorflow.keras import layers, models
        from tensorflow.keras.applications import ResNet50
        
        inputs = layers.Input(shape=(224, 224, 3), name="input_3")
        backbone = ResNet50(
            include_top=False,
            weights=None,
            input_shape=(224, 224, 3),
            name="backbone",
        )
        x = backbone(inputs)
        x = layers.GlobalAveragePooling2D(name="gap")(x)
        x = layers.Dense(512, activation="relu", name="dense")(x)
        x = layers.Dropout(0.2, name="dropout")(x)
        x = layers.Dense(256, activation="relu", name="dense_1")(x)
        x = layers.Dense(128, activation="relu", name="dense_2")(x)
        x = layers.Dense(64, activation="relu", name="dense_3")(x)
        x = layers.Dense(32, activation="relu", name="dense_4")(x)
        x = layers.BatchNormalization(name="batch_normalization")(x)
        outputs = layers.Dense(len(CLASS_NAMES), activation="softmax", name="dense_5")(x)
        
        model = models.Model(inputs=inputs, outputs=outputs, name="resnet50_bohlol")
        model.backbone = backbone
        model.load_weights(str(MODEL_PATH))
        
    print("ResNet50 model ready.")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "api_version": MODEL_VERSION,
        "class_profile": _profile,
        "num_classes": len(CLASS_NAMES),
    }


@app.post("/api/v1/analyze-food")
async def analyze_food(file: UploadFile = File(...)):
    if model is None:
        return {"success": False, "message": "Model not loaded"}
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Fast non-food check: standard deviation & extreme lighting
        img_np = np.array(image)
        std_dev = float(np.std(img_np))
        mean_val = float(np.mean(img_np))
        if std_dev < 12.0:
            return {"success": False, "message": "GATE_FAIL_NOT_FOOD: Solid color or uniform image detected. Please capture a real meal image."}
        if mean_val < 8.0 or mean_val > 248.0:
            return {"success": False, "message": "GATE_FAIL_NOT_FOOD: Overly dark or bright image. Please capture a real meal image."}
            
        portion_meta = estimate_portion_ratio(image)

        image_resized = image.resize((224, 224))
        img_array = tf.keras.preprocessing.image.img_to_array(image_resized)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = safe_preprocess(img_array)

        predictions = model.predict(img_array, verbose=0)
        scores = predictions[0]

        class_index = int(np.argmax(scores))
        predicted_class = CLASS_NAMES[class_index]
        confidence = float(scores[class_index]) * 100
        top_predictions = build_top_predictions(scores)
        confirm_needed = needs_user_confirmation(top_predictions, len(CLASS_NAMES))

        if len(top_predictions) > 1:
            confidence_margin = round(
                top_predictions[0]["confidence"] - top_predictions[1]["confidence"], 2
            )
        else:
            confidence_margin = round(confidence, 2)

        return {
            "success": True,
            "data": {
                "food_name": DISPLAY_NAMES.get(
                    predicted_class, predicted_class.replace("_", " ").title()
                ),
                "food_code": predicted_class,
                "confidence": round(confidence, 2),
                "confidence_margin": confidence_margin,
                "top_predictions": top_predictions,
                "needs_confirmation": confirm_needed,
                "portion_ratio": portion_meta["portion_ratio"],
                "food_area_ratio": portion_meta["food_area_ratio"],
                "model_version": MODEL_VERSION,
            },
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
