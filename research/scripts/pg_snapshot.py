"""Load RBL snapshot from Postgres via docker when admin API unavailable."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / "nutrican-be" / ".env"


def _load_env() -> dict[str, str]:
    out: dict[str, str] = {}
    if not ENV_FILE.exists():
        return out
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        out[key.strip()] = val.strip()
    return out


def pg_log_snapshot(log_id: str) -> dict[str, Any] | None:
    """Read diet_logs row for G0 verification (dev fallback)."""
    env = _load_env()
    user = env.get("POSTGRES_USER")
    db = env.get("POSTGRES_DB")
    password = env.get("POSTGRES_PASSWORD")
    if not user or not db:
        return None

    sql = (
        "SELECT row_to_json(t) FROM (SELECT recognition_source, experiment_cohort, "
        "model_version, ai_confidence_score, ai_predicted_macros, db_matched_macros, "
        "ai_raw_json, db_match_score, matched_food_name "
        f"FROM diet_logs WHERE id='{log_id}') t"
    )
    cmd = [
        "docker",
        "exec",
        "-e",
        f"PGPASSWORD={password or ''}",
        "nutrican-postgres",
        "psql",
        "-U",
        user,
        "-d",
        db,
        "-t",
        "-A",
        "-c",
        sql,
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except (subprocess.SubprocessError, FileNotFoundError):
        return None
    if result.returncode != 0 or not result.stdout.strip():
        return None
    try:
        row = json.loads(result.stdout.strip())
    except json.JSONDecodeError:
        return None

    ai_raw = row.get("ai_raw_json") or {}
    if isinstance(ai_raw, str):
        try:
            ai_raw = json.loads(ai_raw)
        except json.JSONDecodeError:
            ai_raw = {}
    db_macros = row.get("db_matched_macros")
    if isinstance(db_macros, str):
        try:
            db_macros = json.loads(db_macros)
        except json.JSONDecodeError:
            db_macros = None
    ai_macros = row.get("ai_predicted_macros")
    if isinstance(ai_macros, str):
        try:
            ai_macros = json.loads(ai_macros)
        except json.JSONDecodeError:
            ai_macros = None

    portion = ai_raw.get("portionSize") if isinstance(ai_raw, dict) else None
    db_applied = ai_raw.get("db_applied") if isinstance(ai_raw, dict) else None
    return {
        "logId": log_id,
        "recognitionSource": row.get("recognition_source"),
        "experimentCohort": row.get("experiment_cohort"),
        "modelVersion": row.get("model_version"),
        "aiConfidence": row.get("ai_confidence_score"),
        "aiPredictedMacros": ai_macros,
        "dbMatchedMacros": db_macros,
        "dbFoodName": row.get("matched_food_name"),
        "dbMatchScore": row.get("db_match_score"),
        "aiPortionG": portion,
        "dbApplied": db_applied,
        "db_cal": (db_macros or {}).get("calories") if isinstance(db_macros, dict) else None,
    }
