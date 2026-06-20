"""Nutrican ResNet50 food recognition API — see BienBan_BanGiao_AI_Module.pdf."""
from __future__ import annotations

import io
import os
from pathlib import Path

import numpy as np
import tensorflow as tf
import uvicorn
from fastapi import FastAPI, File, UploadFile
from PIL import Image

APP_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL = Path(r"d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5")
MODEL_PATH = Path(os.environ.get("MODEL_PATH", str(DEFAULT_MODEL)))

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
    "com_tam": "Cơm Tấm",
    "goi_cuon": "Gỏi Cuốn",
    "pho": "Phở",
}

MACRO_DATABASE = {
    "banh_chung": {"calories": 600, "protein": 15, "carbs": 65, "fat": 20},
    "banh_khot": {"calories": 350, "protein": 12, "carbs": 45, "fat": 15},
    "banh_mi": {"calories": 400, "protein": 15, "carbs": 45, "fat": 18},
    "banh_trang_nuong": {"calories": 250, "protein": 8, "carbs": 30, "fat": 10},
    "banh_xeo": {"calories": 450, "protein": 16, "carbs": 40, "fat": 22},
    "bun_dau_mam_tom": {"calories": 550, "protein": 25, "carbs": 60, "fat": 22},
    "ca_kho_to": {"calories": 300, "protein": 20, "carbs": 10, "fat": 18},
    "com_tam": {"calories": 650, "protein": 30, "carbs": 80, "fat": 25},
    "goi_cuon": {"calories": 150, "protein": 8, "carbs": 25, "fat": 2},
    "pho": {"calories": 400, "protein": 20, "carbs": 55, "fat": 12},
}


def safe_preprocess(x, **kwargs):
    return tf.keras.applications.resnet50.preprocess_input(x)


app = FastAPI(title="Nutrican AI Snapshot API")
model: tf.keras.Model | None = None


@app.on_event("startup")
def load_model() -> None:
    global model
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
    print(f"Loading model from {MODEL_PATH}...")
    model = tf.keras.models.load_model(
        str(MODEL_PATH),
        custom_objects={
            "preprocess_input": safe_preprocess,
            "<lambda>": safe_preprocess,
        },
    )
    print("ResNet50 model ready.")


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/api/v1/analyze-food")
async def analyze_food(file: UploadFile = File(...)):
    if model is None:
        return {"success": False, "message": "Model not loaded"}
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image = image.resize((224, 224))
        img_array = tf.keras.preprocessing.image.img_to_array(image)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = safe_preprocess(img_array)

        predictions = model.predict(img_array, verbose=0)
        score = tf.nn.softmax(predictions[0])

        class_index = int(np.argmax(score))
        predicted_class = CLASS_NAMES[class_index]
        confidence = float(np.max(score))
        macros = MACRO_DATABASE.get(predicted_class, {})

        return {
            "success": True,
            "data": {
                "food_name": DISPLAY_NAMES.get(predicted_class, predicted_class.replace("_", " ").title()),
                "food_code": predicted_class,
                "confidence": round(confidence * 100, 2),
                "macros": macros,
            },
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
