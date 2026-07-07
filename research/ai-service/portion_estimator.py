"""Bootstrap portion estimation from food area in image (Phase 1).

Maps visible food area → portion_ratio relative to a standard serving.
Replaced by multi-task CNN head in Phase 2.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

# Expected food-area fraction for one standard serving in a typical phone photo.
BASELINE_FOOD_AREA = 0.32
MIN_PORTION_RATIO = 0.5
MAX_PORTION_RATIO = 2.0


def estimate_portion_ratio(image: Image.Image) -> dict[str, float]:
    """Return portion_ratio and food_area_ratio derived from image pixels."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    height, width = rgb.shape[:2]
    total_pixels = float(height * width)

    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]
    max_channel = np.maximum(np.maximum(red, green), blue)
    min_channel = np.minimum(np.minimum(red, green), blue)
    saturation = np.where(max_channel > 0, (max_channel - min_channel) / max_channel, 0.0)
    brightness = max_channel / 255.0

    # Exclude white plates and dark backgrounds; keep colorful / food-like regions.
    is_plate = (brightness > 0.84) & (saturation < 0.12)
    is_dark_bg = brightness < 0.10
    is_food = (~is_plate) & (~is_dark_bg) & ((saturation > 0.07) | (brightness < 0.78))

    food_area_ratio = float(is_food.sum()) / total_pixels
    food_area_ratio = max(food_area_ratio, 0.05)

    # Center-weight: food on plate is usually near image center for meal photos.
    yy, xx = np.mgrid[0:height, 0:width]
    cy, cx = height / 2.0, width / 2.0
    dist = np.sqrt((yy - cy) ** 2 + (xx - cx) ** 2)
    max_dist = np.sqrt(cy**2 + cx**2)
    center_weight = 1.0 - 0.35 * np.clip(dist / max(max_dist, 1.0), 0.0, 1.0)
    weighted_food = is_food.astype(np.float64) * center_weight
    weighted_ratio = float(weighted_food.sum()) / total_pixels
    weighted_ratio = max(weighted_ratio, food_area_ratio * 0.85)

    portion_ratio = weighted_ratio / BASELINE_FOOD_AREA
    portion_ratio = float(np.clip(portion_ratio, MIN_PORTION_RATIO, MAX_PORTION_RATIO))

    return {
        "portion_ratio": round(portion_ratio, 3),
        "food_area_ratio": round(food_area_ratio, 4),
    }
