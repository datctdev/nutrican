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

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent.parent  # d:\nutrican-pt-workspace
DEFAULT_MODEL = PROJECT_ROOT / "research" / "best_resnet50_model.h5"
MODEL_PATH = Path(os.environ.get("MODEL_PATH", str(DEFAULT_MODEL)))
MODEL_VERSION = os.environ.get(
    "MODEL_VERSION",
    "resnet50-vtn-10class-phase2" if "phase2" in MODEL_PATH.name else "resnet50-vtn-10class-phase1",
)

# Alphabetical order — must match training labels (Bien ban §3).
CLASS_NAMES = [
    "banh_chung",
    "banh_khot",
    "banh_mi",
    "banh_trang_nuong",
    "banh_xeo",
    "bun_dau_mam_tom",
    "ca_kho_to",
    "com_tam",
    "goi_cuon",
    "pho",
]

DISPLAY_NAMES = {
    "banh_chung": "Bánh Chưng",
    "banh_khot": "Bánh Khọt",
    "banh_mi": "Bánh Mì",
    "banh_trang_nuong": "Bánh Tráng Nướng",
    "banh_xeo": "Bánh Xèo",
    "bun_dau_mam_tom": "Bún Đậu Mắm Tôm",
    "ca_kho_to": "Cá Kho Tộ",
    "com_tam": "Cơm Tấm (Cơm sườn)",
    "goi_cuon": "Gỏi Cuốn",
    "pho": "Phở",
}

CONFIDENCE_CONFIRM_THRESHOLD = 85.0
MARGIN_CONFIRM_THRESHOLD = 20.0


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


def needs_user_confirmation(top_predictions: list[dict]) -> bool:
    if not top_predictions:
        return True
    top_conf = top_predictions[0]["confidence"]
    if top_conf < CONFIDENCE_CONFIRM_THRESHOLD:
        return True
    if len(top_predictions) > 1:
        margin = top_predictions[0]["confidence"] - top_predictions[1]["confidence"]
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
    model = tf.keras.models.load_model(
        str(MODEL_PATH),
        custom_objects=model_custom_objects(),
    )
    print("ResNet50 model ready.")


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None, "api_version": MODEL_VERSION}


@app.post("/api/v1/analyze-food")
async def analyze_food(file: UploadFile = File(...)):
    if model is None:
        return {"success": False, "message": "Model not loaded"}
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        portion_meta = estimate_portion_ratio(image)

        image_resized = image.resize((224, 224))
        img_array = tf.keras.preprocessing.image.img_to_array(image_resized)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = safe_preprocess(img_array)

        predictions = model.predict(img_array, verbose=0)
        scores = tf.nn.softmax(predictions[0]).numpy()

        class_index = int(np.argmax(scores))
        predicted_class = CLASS_NAMES[class_index]
        confidence = float(scores[class_index]) * 100
        top_predictions = build_top_predictions(scores)
        confirm_needed = needs_user_confirmation(top_predictions)

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
