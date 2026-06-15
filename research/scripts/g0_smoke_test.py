#!/usr/bin/env python3
"""G0 smoke test — verify RBL pipeline via live API (LO_TRINH §G0)."""
from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from research_api import ResearchClient, git_commit_short, macro_val  # noqa: E402
from pg_snapshot import pg_log_snapshot  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DIR = REPO_ROOT / "research" / "seed" / "test"
G0_DOC = REPO_ROOT / "docs" / "research" / "G0_VERIFICATION.md"
EXPECTED_MODEL_SUBSTR = "llava"

REQUIRED_CSV_COLS = [
    "delta_ai_cal",
    "delta_db_cal",
    "db_match_score",
    "recognition_source",
    "experiment_cohort",
    "ai_portion_g",
    "db_applied",
    "blind_cal",
    "diet_log_items_json",
]


def pick_test_image(stem: str) -> Path:
    test_dir = TEST_DIR
    for name in (f"{stem}.png", f"{stem}.jpg", f"{stem}.jpeg"):
        p = test_dir / name
        if p.exists():
            return p
    fallback = TEST_DIR / "smoke_meal.jpg"
    if fallback.exists():
        return fallback
    raise FileNotFoundError(f"No test image for {stem} in {TEST_DIR}")


def tick(pass_: bool) -> str:
    return "☑" if pass_ else "☐"


def check_scaling(row: dict, foods: list[dict]) -> tuple[bool, str]:
    """Verify db_cal ≈ food.calories × (ai_portion_g / serving_size_g)."""
    db_name = row.get("dbFoodName") or row.get("db_food_name")
    db_macros = row.get("dbMatchedMacros") or {}
    db_cal = macro_val(db_macros, "calories")
    if db_cal is None:
        db_cal_raw = row.get("db_cal")
        db_cal = float(db_cal_raw) if db_cal_raw not in (None, "") else None
    portion = row.get("aiPortionG") or row.get("ai_portion_g")
    if db_cal is None or not db_name or portion in (None, ""):
        return False, "skip: no db match row for scaling check"
    portion_f = float(portion)
    food = next(
        (f for f in foods if f.get("nameVi") == db_name or f.get("nameEn") == db_name),
        None,
    )
    if not food:
        matches = [f for f in foods if db_name.lower() in (f.get("nameVi") or "").lower()]
        food = matches[0] if matches else None
    if not food:
        return False, f"food not found in catalog for {db_name!r}"
    serving = float(food.get("servingSizeG") or 0)
    base_cal = float(food.get("calories") or 0)
    if serving <= 0:
        return False, "invalid serving size"
    ratio = portion_f / serving
    expected = base_cal * ratio
    diff = abs(db_cal - expected)
    tol = max(5.0, expected * 0.02)
    ok = diff <= tol
    detail = (
        f"food={food.get('nameVi')} base_cal={base_cal} serving_g={serving} "
        f"portion_g={portion_f} ratio={ratio:.4f} "
        f"expected_db_cal={expected:.2f} actual_db_cal={db_cal:.2f} diff={diff:.2f} tol={tol:.2f}"
    )
    return ok, detail


def update_g0_doc(results: dict[str, bool], notes: list[str]) -> None:
    text = G0_DOC.read_text(encoding="utf-8")
    today = date.today().isoformat()
    commit = git_commit_short()
    text = re.sub(r"\*\*Ngày kiểm:\*\* .*", f"**Ngày kiểm:** {today}", text)
    text = re.sub(r"\*\*Commit / version:\*\* .*", f"**Commit / version:** {commit}", text)
    text = re.sub(
        r"\*\*Người kiểm:\*\* .*",
        "**Người kiểm:** g0_smoke_test.py (automated)",
        text,
    )

    g02 = results.get("0.2", False)
    all_pass = all(results.values())

    replacements = {
        "| 0.1 RBL snapshots | ☐ Pass / ☐ Fail |": f"| 0.1 RBL snapshots | {tick(results.get('0.1', False))} Pass / {tick(not results.get('0.1', False))} Fail |",
        "| 0.2 Portion scaling | ☐ Pass / ☐ Fail |": f"| 0.2 Portion scaling | {tick(g02)} Pass / {tick(not g02)} Fail |",
        "| 0.3 CSV columns | ☐ Pass / ☐ Fail |": f"| 0.3 CSV columns | {tick(results.get('0.3', False))} Pass / {tick(not results.get('0.3', False))} Fail |",
        "| 0.4 Hybrid pipeline | ☐ Pass / ☐ Fail |": f"| 0.4 Hybrid pipeline | {tick(results.get('0.4', False))} Pass / {tick(not results.get('0.4', False))} Fail |",
        "**Sẵn sàng thu data G2:** ☐ Có — chỉ khi cả 4 mục Pass": f"**Sẵn sàng thu data G2:** {tick(all_pass)} Có — chỉ khi cả 4 mục Pass",
        "| ☐ scaling OK | Dùng `db_cal` trực tiếp từ CSV |": f"| {tick(g02)} scaling OK | Dùng `db_cal` trực tiếp từ CSV |",
    }
    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new)

    for key in ("0.1", "0.2", "0.3", "0.4"):
        label = {
            "0.1": "0.1 RBL snapshots",
            "0.2": "0.2 Portion scaling",
            "0.3": "0.3 CSV columns",
            "0.4": "0.4 Hybrid pipeline",
        }[key]
        passed = results.get(key, False) if key != "0.2" else g02
        text = re.sub(
            rf"\| {re.escape(label)} \| [☑☐] Pass / [☑☐] Fail \|",
            f"| {label} | {tick(passed)} Pass / {tick(not passed)} Fail |",
            text,
        )

    note_block = "\n".join(f"- {n}" for n in notes)
    run_header = f"## G0 run log ({today})"
    if run_header in text:
        text = re.sub(
            rf"{re.escape(run_header)}.*?(?=\n---\n\n## Tổng kết G0)",
            f"{run_header}\n\n{note_block}\n",
            text,
            flags=re.DOTALL,
        )
    else:
        text = text.replace(
            "## Tổng kết G0",
            f"{run_header}\n\n{note_block}\n\n---\n\n## Tổng kết G0",
        )
    G0_DOC.write_text(text, encoding="utf-8")


def fetch_snapshot(admin: ResearchClient, log_id: str | None) -> dict | None:
    if not log_id:
        return None
    try:
        return admin.get_log_snapshot(log_id)
    except requests.HTTPError:
        return pg_log_snapshot(log_id)


def run_smoke(skip_backend: bool = False) -> int:
    notes: list[str] = []
    results = {"0.1": False, "0.2": False, "0.3": False, "0.4": False}

    try:
        home_image = pick_test_image("smoke_pho")
        rest_image = pick_test_image("smoke_pizza")
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if skip_backend:
        notes.append("Skipped live API (--skip-backend)")
        update_g0_doc(results, notes)
        return 0

    client = ResearchClient()
    if not client.health_backend():
        notes.append("Backend unreachable — start docker-compose + backend + Ollama (llava)")
        update_g0_doc(results, notes)
        print("FAIL: backend not reachable", file=sys.stderr)
        return 2

    admin_email = __import__("os").environ.get("RESEARCH_ADMIN_EMAIL", "admin@nutrican.com")
    admin_pass = __import__("os").environ.get("RESEARCH_ADMIN_PASSWORD", "Admin123!")
    cust_email = __import__("os").environ.get("RESEARCH_CUSTOMER_EMAIL", "research.customer@nutrican.dev")
    cust_pass = __import__("os").environ.get("RESEARCH_CUSTOMER_PASSWORD", "Research123!")

    admin = ResearchClient()
    customer = ResearchClient()
    home_log_id: str | None = None
    rest_log_id: str | None = None
    home_row: dict | None = None
    rest_row: dict | None = None

    try:
        admin.login(admin_email, admin_pass)
        customer.ensure_login(cust_email, cust_pass, "Research Customer")
        ai = admin.ai_health()
        model = str(ai.get("model", ""))
        notes.append(f"AI health: available={ai.get('available')} model={model}")
        if EXPECTED_MODEL_SUBSTR not in model.lower():
            notes.append(f"WARN: expected model containing '{EXPECTED_MODEL_SUBSTR}'")
    except requests.HTTPError as exc:
        notes.append(f"Auth failed: {exc}")
        update_g0_doc(results, notes)
        return 3

    # HOME upload — expect HYBRID when phở matches food DB + confidence ≥ 0.6
    try:
        notes.append(f"HOME image: {home_image.name}")
        analyze_home = customer.analyze_meal(
            home_image,
            meal_source="HOME_COOKED",
            meal_complexity="SIMPLE",
        )
        home_log_id = str(analyze_home.get("logId", ""))
        notes.append(
            f"HOME analyze logId={home_log_id} food={analyze_home.get('foodName')} "
            f"conf={analyze_home.get('confidenceScore')} portion={analyze_home.get('portionSize')}"
        )
        home_row = fetch_snapshot(admin, home_log_id)
        if home_row:
            has_ai = macro_val(home_row.get("aiPredictedMacros"), "calories") is not None
            has_db_field = home_row.get("dbMatchedMacros") is not None
            has_model = bool(home_row.get("modelVersion"))
            has_cohort = bool(home_row.get("experimentCohort"))
            results["0.1"] = bool(home_log_id) and has_ai and has_model and has_cohort
            notes.append(
                f"0.1 snapshots: ai={has_ai} db_macros={has_db_field} model={has_model} "
                f"cohort={home_row.get('experimentCohort')} recognition={home_row.get('recognitionSource')}"
            )
        else:
            notes.append("0.1 FAIL: no RBL snapshot (admin API + Postgres fallback)")
    except requests.HTTPError as exc:
        notes.append(f"HOME analyze failed: {exc.response.text[:300] if exc.response else exc}")

    # REST upload — expect AI_ONLY (pizza not in Vietnamese food DB)
    try:
        notes.append(f"REST image: {rest_image.name}")
        analyze_rest = customer.analyze_meal(
            rest_image,
            meal_source="RESTAURANT",
            meal_complexity="SIMPLE",
            restaurant_name="G0 Smoke Test Quan XYZ",
        )
        rest_log_id = str(analyze_rest.get("logId", ""))
        notes.append(
            f"REST analyze logId={rest_log_id} food={analyze_rest.get('foodName')} "
            f"conf={analyze_rest.get('confidenceScore')}"
        )
        rest_row = fetch_snapshot(admin, rest_log_id)
    except requests.HTTPError as exc:
        notes.append(f"REST analyze failed: {exc.response.text[:300] if exc.response else exc}")

    # G0.3 — CSV columns
    try:
        csv_bytes = admin.export_csv_bytes()
        csv_text = csv_bytes.decode("utf-8")
        lines = csv_text.splitlines()
        has_version = any("food_db_version=v2-60" in ln for ln in lines[:3])
        cols_line = next((ln for ln in lines if ln.startswith("log_id,")), lines[1] if len(lines) > 1 else "")
        cols = cols_line.split(",")
        missing = [c for c in REQUIRED_CSV_COLS if c not in cols]
        results["0.3"] = has_version and not missing
        notes.append(f"0.3 csv: missing_cols={missing or 'none'} version_header={has_version}")
    except requests.HTTPError as exc:
        notes.append(f"Export failed: {exc}")

    # G0.2 — numeric scaling on HYBRID home row
    try:
        row = home_row
        if row and row.get("recognitionSource") != "HYBRID":
            notes.append("0.2: HOME row not HYBRID — scaling check uses db row if present")
        foods: list[dict] = []
        for q in ("phở", "cơm", "bún", "bánh", "gà"):
            foods.extend(admin.search_foods(q))
        seen: set[str] = set()
        unique_foods = [f for f in foods if f.get("id") not in seen and not seen.add(str(f.get("id")))]
        if row:
            ok, msg = check_scaling(row, unique_foods)
            if "skip" not in msg:
                results["0.2"] = ok
                notes.append(f"0.2 scaling {'PASS' if ok else 'FAIL'}: {msg}")
            else:
                notes.append(f"0.2 FAIL: {msg}")
        else:
            notes.append("0.2 FAIL: no snapshot row")
    except requests.HTTPError as exc:
        notes.append(f"Scaling check error: {exc}")

    # G0.4 — HYBRID (home) + AI_ONLY (rest)
    try:
        home_src = home_row.get("recognitionSource") if home_row else None
        rest_src = rest_row.get("recognitionSource") if rest_row else None
        home_conf = home_row.get("aiConfidence") if home_row else None
        hybrid_ok = home_src == "HYBRID"
        ai_only_ok = rest_src == "AI_ONLY"
        results["0.4"] = hybrid_ok and ai_only_ok
        notes.append(
            f"0.4 HOME={home_src} (expect HYBRID, conf={home_conf}) | "
            f"REST={rest_src} (expect AI_ONLY)"
        )
    except Exception as exc:
        notes.append(f"Hybrid check error: {exc}")

    update_g0_doc(results, notes)
    out = "\n".join(notes) + f"\n\nG0 results: {results}\nUpdated {G0_DOC}"
    try:
        print(out)
    except UnicodeEncodeError:
        print(out.encode("ascii", errors="replace").decode("ascii"))
    return 0 if all(results.values()) else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="NutriCan G0 smoke test")
    parser.add_argument("--skip-backend", action="store_true", help="Skip API calls")
    args = parser.parse_args()
    return run_smoke(skip_backend=args.skip_backend)


if __name__ == "__main__":
    sys.exit(main())
