#!/usr/bin/env python3
"""G0 smoke test for ResNet50 + FastAPI + Spring Boot (replaces llava g0_smoke_test)."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from repo_paths import DEFAULT_DATASET, REPO_ROOT  # noqa: E402
from research_api import ResearchClient, git_commit_short  # noqa: E402

AI_BASE = "http://localhost:8000"
DATASET = DEFAULT_DATASET
G0_DOC = REPO_ROOT / "docs" / "research" / "G0_VERIFICATION.md"
EXPECTED_MODEL = "resnet50-unified-vtn-food101"
EXPECTED_CLASSES = 199

CLASS_SAMPLES = [
    "pho",
    "banh_mi",
    "com_tam",
]


def check_fastapi() -> tuple[bool, str]:
    try:
        r = requests.get(f"{AI_BASE}/health", timeout=5)
        r.raise_for_status()
        body = r.json()
        if not body.get("model_loaded"):
            return False, "model not loaded"
        nc = body.get("num_classes")
        if nc != EXPECTED_CLASSES:
            return False, f"expected {EXPECTED_CLASSES} classes, got {nc}"
        return True, f"FastAPI health OK ({nc} classes, profile={body.get('class_profile')})"
    except requests.RequestException as e:
        return False, f"FastAPI unreachable: {e}"


def check_predict(class_name: str) -> tuple[bool, str]:
    folder = DATASET / class_name
    images = sorted(folder.glob("*.jpg")) + sorted(folder.glob("*.jpeg")) + sorted(folder.glob("*.png"))
    if not images:
        return False, f"no sample image for {class_name}"
    img = images[0]
    try:
        with img.open("rb") as f:
            r = requests.post(
                f"{AI_BASE}/api/v1/analyze-food",
                files={"file": (img.name, f, "image/jpeg")},
                timeout=60,
            )
        r.raise_for_status()
        body = r.json()
        if not body.get("success"):
            return False, body.get("message", "predict failed")
        data = body.get("data", {})
        return True, f"{class_name} -> {data.get('food_code')} ({data.get('confidence')}%)"
    except requests.RequestException as e:
        return False, str(e)


def check_spring_analyze(client: ResearchClient, class_name: str) -> tuple[bool, str]:
    folder = DATASET / class_name
    images = sorted(folder.glob("*.jpg")) + sorted(folder.glob("*.jpeg"))
    if not images:
        return False, "no image"
    img = images[0]
    try:
        resp = client.analyze_meal(img, meal_type="LUNCH")
        log = resp if isinstance(resp, dict) else {}
        model = log.get("modelVersion") or log.get("model_version") or ""
        food = log.get("foodDescription") or log.get("food_description") or ""
        ai_macros = log.get("aiPredictedMacros") or log.get("ai_predicted_macros") or {}
        db_macros = log.get("dbMatchedMacros") or log.get("db_matched_macros")
        ok_model = EXPECTED_MODEL in str(model)
        ok_macros = bool(ai_macros)
        ok_db = db_macros is not None
        detail = f"model={model}, food={food}, ai_macros={bool(ai_macros)}, db={ok_db}"
        return ok_model and ok_macros, detail
    except Exception as e:
        return False, str(e)


def write_g0_doc(results: list[tuple[str, bool, str]]) -> None:
    lines = [
        "# G0 Verification — ResNet50 AI Module",
        "",
        f"Commit: `{git_commit_short()}`",
        f"Expected model: `{EXPECTED_MODEL}`",
        "",
        "| Check | Pass | Detail |",
        "|-------|------|--------|",
    ]
    for name, ok, detail in results:
        lines.append(f"| {name} | {'☑' if ok else '☐'} | {detail} |")
    G0_DOC.parent.mkdir(parents=True, exist_ok=True)
    G0_DOC.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-spring", action="store_true")
    parser.add_argument("--email", default="customer1@nutrican.com")
    parser.add_argument("--password", default="Customer123!")
    args = parser.parse_args()

    results: list[tuple[str, bool, str]] = []

    ok, msg = check_fastapi()
    results.append(("FastAPI /health", ok, msg))
    print(f"[{'PASS' if ok else 'FAIL'}] FastAPI: {msg}")

    for cls in CLASS_SAMPLES:
        ok, msg = check_predict(cls)
        results.append((f"FastAPI predict {cls}", ok, msg))
        print(f"[{'PASS' if ok else 'FAIL'}] predict {cls}: {msg}")

    if not args.skip_spring:
        client = ResearchClient()
        if not client.health_backend():
            results.append(("Spring backend", False, "backend unreachable"))
            print("[FAIL] Spring backend unreachable")
        else:
            try:
                client.login(args.email, args.password)
                health = client.ai_health()
                model = health.get("model", "")
                ok = EXPECTED_MODEL in model
                results.append(("Spring /ai/health model", ok, str(health)))
                print(f"[{'PASS' if ok else 'FAIL'}] Spring AI health: {health}")

                ok, msg = check_spring_analyze(client, "pho")
                results.append(("Spring analyzeMeal pho", ok, msg))
                print(f"[{'PASS' if ok else 'FAIL'}] analyzeMeal: {msg}")
            except Exception as e:
                results.append(("Spring login/analyze", False, str(e)))
                print(f"[FAIL] Spring: {e}")

    write_g0_doc(results)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\nG0: {passed}/{len(results)} passed. Doc: {G0_DOC}")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
