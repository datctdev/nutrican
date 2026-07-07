#!/usr/bin/env python3
"""Smoke test: 199-class unified ResNet + optional BE analyze-meal flow."""
from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
sys.path.insert(0, str(SCRIPT_DIR.parent / "ai-service"))

from repo_paths import DISHES_100_IMAGES, FOOD101_IMAGES, REPO_ROOT, VTN_10_DATASET  # noqa: E402

AI_BASE = "http://localhost:8000"
BE_BASE = "http://localhost:8080"
EXPECTED_CLASSES = 199
EXPECTED_PROFILE = "resnet_unified"
EXPECTED_MODEL_VERSION = "resnet50-unified-vtn-food101"


def load_unified_codes() -> list[str]:
    manifest = REPO_ROOT / "research" / "data" / "class_manifests" / "resnet_unified.json"
    data = json.loads(manifest.read_text(encoding="utf-8"))
    return list(data["classOrder"])


def find_sample_image(code: str) -> Path | None:
    candidates = [
        VTN_10_DATASET / code,
        DISHES_100_IMAGES / code,
        FOOD101_IMAGES / code,
    ]
    for folder in candidates:
        if not folder.is_dir():
            continue
        for ext in ("*.jpg", "*.jpeg", "*.png"):
            hits = sorted(folder.glob(ext))
            if hits:
                return hits[0]
    return None


def check_health() -> tuple[bool, dict]:
    r = requests.get(f"{AI_BASE}/health", timeout=10)
    r.raise_for_status()
    body = r.json()
    ok = (
        body.get("model_loaded") is True
        and body.get("num_classes") == EXPECTED_CLASSES
        and body.get("class_profile") == EXPECTED_PROFILE
    )
    return ok, body


def predict_image(path: Path) -> dict:
    with path.open("rb") as f:
        r = requests.post(
            f"{AI_BASE}/api/v1/analyze-food",
            files={"file": (path.name, f, "image/jpeg")},
            timeout=120,
        )
    r.raise_for_status()
    body = r.json()
    if not body.get("success"):
        raise RuntimeError(body.get("message", "predict failed"))
    return body["data"]


def discrimination_sample(codes: list[str], sample_size: int, seed: int) -> list[tuple[str, bool, str]]:
    rng = random.Random(seed)
    picked = rng.sample(codes, min(sample_size, len(codes)))
    results = []
    for code in picked:
        img = find_sample_image(code)
        if img is None:
            results.append((code, False, "no sample image"))
            continue
        try:
            data = predict_image(img)
            pred = data.get("food_code")
            conf = data.get("confidence")
            ok = pred == code
            top = data.get("top_predictions") or []
            top3 = ", ".join(f"{p.get('food_code')}({p.get('confidence')}%)" for p in top[:3])
            detail = f"pred={pred} conf={conf}% top3=[{top3}]"
            results.append((code, ok, detail))
        except Exception as e:
            results.append((code, False, str(e)))
    return results


def check_be_analyze(email: str, password: str, image: Path) -> tuple[bool, str]:
    login = requests.post(
        f"{BE_BASE}/api/v1/auth/login",
        json={"email": email, "password": password},
        timeout=30,
    )
    if login.status_code != 200:
        return False, f"login failed: {login.status_code} {login.text[:200]}"
    token = login.json().get("data", {}).get("accessToken")
    if not token:
        return False, "no access token"
    headers = {"Authorization": f"Bearer {token}"}
    with image.open("rb") as f:
        r = requests.post(
            f"{BE_BASE}/api/v1/diet/logs/analyze",
            headers=headers,
            files={"file": (image.name, f, "image/jpeg")},
            data={"mealType": "LUNCH"},
            timeout=180,
        )
    if r.status_code != 200:
        return False, f"analyze failed: {r.status_code} {r.text[:300]}"
    data = r.json().get("data") or {}
    food_code = data.get("foodCode") or data.get("detectedFoodCode") or "?"
    model = data.get("modelVersion") or "?"
    return True, f"foodCode={food_code}, modelVersion={model}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample-size", type=int, default=30, help="Random classes to test discrimination")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--be", action="store_true", help="Also test POST /diet/logs/analyze via Spring BE")
    parser.add_argument("--email", default="customer1@nutrican.com")
    parser.add_argument("--password", default="Customer123!")
    args = parser.parse_args()

    print("=== AI Service health ===")
    try:
        ok, body = check_health()
        print(json.dumps(body, indent=2))
        if not ok:
            print("FAIL: expected num_classes=199, class_profile=resnet_unified, model_loaded=true")
            return 1
        print("PASS: health OK (199 classes)\n")
    except requests.RequestException as e:
        print(f"FAIL: AI service not reachable at {AI_BASE}: {e}")
        print("Start: research\\run-ai-service.bat")
        return 1

    codes = load_unified_codes()
    print(f"=== Discrimination sample ({args.sample_size} / {len(codes)} classes) ===")
    results = discrimination_sample(codes, args.sample_size, args.seed)
    passed = sum(1 for _, ok, _ in results if ok)
    for code, ok, detail in results:
        print(f"[{'OK' if ok else 'MISS'}] {code}: {detail}")
    acc = passed / len(results) if results else 0
    print(f"\nTop-1 accuracy on sample: {passed}/{len(results)} = {acc*100:.1f}%\n")

    if args.be:
        print("=== BE analyze-meal ===")
        img = find_sample_image("pho") or find_sample_image("com_tam")
        if img is None:
            print("SKIP: no sample image for BE test")
        else:
            ok, msg = check_be_analyze(args.email, args.password, img)
            print(f"[{'PASS' if ok else 'FAIL'}] {msg}")

    return 0 if acc >= 0.5 else 1


if __name__ == "__main__":
    raise SystemExit(main())
