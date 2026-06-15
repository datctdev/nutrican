#!/usr/bin/env python3
"""Batch seed research dataset from manifest.csv (dev-only)."""
from __future__ import annotations

import argparse
import csv
import json
import os
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from research_api import ResearchClient  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = REPO_ROOT / "research" / "seed"
IMAGES_DIR = SEED_DIR / "images"
MANIFEST = SEED_DIR / "manifest.csv"
TEST_IMAGE = SEED_DIR / "test" / "smoke_meal.jpg"
OUTPUT = REPO_ROOT / "research" / "output" / "seed_run_report.json"


def parse_uuid_list(raw: str | None) -> list[str]:
    if not raw or not str(raw).strip():
        return []
    return [x.strip() for x in str(raw).split(",") if x.strip()]


def load_manifest(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def resolve_image(row: dict[str, str]) -> Path | None:
    fn = row.get("filename", "").strip()
    if not fn:
        return None
    candidate = IMAGES_DIR / fn
    return candidate if candidate.exists() else None


def ensure_pt_setup(pt: ResearchClient, customer_id: str) -> bool:
    """Assign client to PT if PT login works."""
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
    admin_email = os.environ.get("RESEARCH_ADMIN_EMAIL", "admin@nutrican.com")
    admin_pass = os.environ.get("RESEARCH_ADMIN_PASSWORD", "Admin123!")

    rows = load_manifest(MANIFEST)
    available = [r for r in rows if resolve_image(r)]
    missing = [r["filename"] for r in rows if r.get("filename") and not resolve_image(r)]

    report: dict = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "manifest_rows": len(rows),
        "images_found": len(available),
        "images_missing": missing,
        "runs": [],
    }

    if not available:
        print("No images in research/seed/images/ — only G0 path available.")
        print("Place 30 real photos matching manifest.csv filenames, then re-run.")
        print(f"Test image for G0: {TEST_IMAGE}")
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 0

    if dry_run:
        print(f"Dry run: would process {len(available)} images")
        for r in available[: limit or len(available)]:
            print(f"  - {r['filename']} ({r.get('cohort_target')})")
        return 0

    client = ResearchClient()
    if not client.health_backend():
        print("Backend not reachable — start docker-compose + backend first.", file=sys.stderr)
        return 2

    admin = ResearchClient()
    customer = ResearchClient()
    pt = ResearchClient()

    customer.ensure_login(cust_email, cust_pass, "Research Customer")
    admin.login(admin_email, admin_pass)

    pt_ready = False
    try:
        pt.ensure_login(pt_email, pt_pass, "Research PT")
        pt_ready = ensure_pt_setup(pt, str(customer.user.get("id")))
    except requests.HTTPError:
        print("PT login/setup failed — uploads only, no auto-label.", file=sys.stderr)

    to_process = available[: limit] if limit else available
    random.seed(42)

    for row in to_process:
        img = resolve_image(row)
        assert img is not None
        entry: dict = {"filename": row["filename"], "status": "pending"}
        try:
            analyze = customer.analyze_meal(
                img,
                meal_source=row.get("meal_source", "HOME_COOKED"),
                meal_complexity=row.get("meal_complexity", "SIMPLE"),
                restaurant_name=row.get("restaurant_name") or None,
                hotpot_broth_id=row.get("hotpot_broth_id") or None,
                hotpot_item_ids=parse_uuid_list(row.get("hotpot_item_ids")),
                composite_item_ids=parse_uuid_list(row.get("composite_item_ids")),
            )
            log_id = str(analyze.get("logId"))
            entry.update(
                {
                    "log_id": log_id,
                    "food_name": analyze.get("foodName"),
                    "confidence": analyze.get("confidenceScore"),
                }
            )

            detail = customer.get_log(log_id)
            if detail.get("status") == "DRAFT":
                customer.submit_for_review(log_id)

            if pt_ready and row.get("pt_cal"):
                if row.get("blind_estimate", "").lower() == "true":
                    pt.blind_estimate(
                        log_id,
                        calories=float(row["pt_cal"]) * 0.95,
                        protein=float(row.get("pt_pro") or 0),
                        carb=float(row.get("pt_carb") or 0),
                        fat=float(row.get("pt_fat") or 0),
                    )
                pt.review_log(
                    log_id,
                    action="ADJUST_MACROS",
                    calories=float(row["pt_cal"]),
                    protein=float(row.get("pt_pro") or 0),
                    carb=float(row.get("pt_carb") or 0),
                    fat=float(row.get("pt_fat") or 0),
                    note=f"seed dev auto-label | {row.get('notes', '')}",
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
    parser = argparse.ArgumentParser(description="Seed NutriCan research dataset")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    return run_seed(dry_run=args.dry_run, limit=args.limit)


if __name__ == "__main__":
    sys.exit(main())
