#!/usr/bin/env python3
"""Upload ResNet10 seed images and apply PT labels from resnet10_manifest.csv."""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from research_api import ResearchClient  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = REPO_ROOT / "research" / "seed" / "resnet10"
MANIFEST = REPO_ROOT / "research" / "seed" / "resnet10_manifest.csv"
OUTPUT = REPO_ROOT / "research" / "output" / "resnet_rbl_seed_report.json"
EXPECTED_MODEL = "resnet50-vtn-10class"


def load_manifest(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def resolve_image(row: dict[str, str]) -> Path | None:
    fn = row.get("filename", "").strip()
    if not fn:
        return None
    candidate = SEED_DIR / fn
    return candidate if candidate.exists() else None


def ensure_pt_setup(pt: ResearchClient, customer_id: str) -> bool:
    try:
        pt.assign_client(customer_id)
        return True
    except requests.HTTPError as exc:
        print(f"PT assign skipped: {exc}", file=sys.stderr)
        return False


def run_seed(*, dry_run: bool = False, limit: int | None = None) -> int:
    cust_email = os.environ.get("RESEARCH_CUSTOMER_EMAIL", "research.customer@nutrican.dev")
    cust_pass = os.environ.get("RESEARCH_CUSTOMER_PASSWORD", "Research123!")
    pt_email = os.environ.get("RESEARCH_PT_EMAIL", "research.pt@nutrican.dev")
    pt_pass = os.environ.get("RESEARCH_PT_PASSWORD", "Research123!")

    rows = load_manifest(MANIFEST)
    available = [r for r in rows if resolve_image(r)]
    missing = [r["filename"] for r in rows if r.get("filename") and not resolve_image(r)]

    report: dict = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "expected_model": EXPECTED_MODEL,
        "manifest_rows": len(rows),
        "images_found": len(available),
        "images_missing": missing,
        "runs": [],
    }

    if not available:
        print(f"No images in {SEED_DIR} — run prepare_resnet_rbl_seed.py first.", file=sys.stderr)
        return 1

    if dry_run:
        print(f"Dry run: would process {len(available)} images")
        for r in available[: limit or len(available)]:
            print(f"  - {r['filename']} ({r.get('food_code') or 'negative'})")
        return 0

    client = ResearchClient()
    if not client.health_backend():
        print("Backend not reachable — start postgres/minio + Spring Boot first.", file=sys.stderr)
        return 2

    customer = ResearchClient()
    pt = ResearchClient()
    customer.ensure_login(cust_email, cust_pass, "Research Customer")

    pt_ready = False
    try:
        pt.ensure_login(pt_email, pt_pass, "Research PT")
        pt_ready = ensure_pt_setup(pt, str(customer.user.get("id")))
    except requests.HTTPError:
        print("PT login/setup failed — uploads only.", file=sys.stderr)

    to_process = available[: limit] if limit else available
    for row in to_process:
        img = resolve_image(row)
        assert img is not None
        entry: dict = {"filename": row["filename"], "status": "pending"}
        try:
            analyze = customer.analyze_meal(
                img,
                meal_source=row.get("meal_source", "HOME_COOKED"),
                meal_complexity=row.get("meal_complexity", "SIMPLE"),
            )
            log_id = str(analyze.get("logId"))
            entry.update(
                {
                    "log_id": log_id,
                    "food_name": analyze.get("foodName"),
                    "confidence": analyze.get("confidenceScore"),
                    "model_version": analyze.get("modelVersion"),
                }
            )

            if EXPECTED_MODEL not in str(analyze.get("modelVersion", "")):
                entry["model_warning"] = f"expected {EXPECTED_MODEL}"

            detail = customer.get_log(log_id)
            if detail.get("status") == "DRAFT":
                customer.submit_for_review(log_id)

            if pt_ready and row.get("pt_cal"):
                action = row.get("pt_action", "ADJUST_MACROS")
                pt.review_log(
                    log_id,
                    action=action,
                    calories=float(row["pt_cal"]),
                    protein=float(row.get("pt_pro") or 0),
                    carb=float(row.get("pt_carb") or 0),
                    fat=float(row.get("pt_fat") or 0),
                    correction_reason=row.get("pt_correction_reason") or None,
                    note=f"resnet10 seed | {row.get('notes', '')}",
                )
                entry["pt_labeled"] = True
            else:
                entry["pt_labeled"] = False

            entry["status"] = "ok"
        except requests.HTTPError as exc:
            entry["status"] = "error"
            entry["error"] = exc.response.text[:300] if exc.response else str(exc)
        report["runs"].append(entry)
        print(f"{entry['filename']}: {entry['status']}")

    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Report: {OUTPUT}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed ResNet10 RBL cohort via API")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    return run_seed(dry_run=args.dry_run, limit=args.limit)


if __name__ == "__main__":
    sys.exit(main())
