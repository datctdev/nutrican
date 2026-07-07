#!/usr/bin/env python3
"""Auto-fill docs/research/RESULTS_TEMPLATE.md from RBL CSV export."""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from rbl_analyze import LABELED_ACTIONS, labeled, load_csv, mae_series, rmse_series  # noqa: E402

from repo_paths import OUTPUT_RBL, REPO_ROOT

TEMPLATE = REPO_ROOT / "docs" / "research" / "RESULTS_TEMPLATE.md"


def fmt(v: float | None, digits: int = 1) -> str:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return "_n/a_"
    return f"{v:.{digits}f}"


def cohort_table(lab: pd.DataFrame) -> str:
    targets = [
        "HOME_HYBRID_DB",
        "RESTAURANT_AI_ONLY",
        "RESTAURANT_HYBRID_DB",
        "HOTPOT_HYBRID",
        "COMPOSITE_BUFFET",
    ]
    lines = ["| Cohort | n | MAE A1.0 | MAE A1.1 | ΔA |", "|--------|---|----------|----------|-----|"]
    if "experiment_cohort" not in lab.columns:
        for t in targets:
            lines.append(f"| {t} | | | | |")
        return "\n".join(lines)
    for cohort in targets:
        g = lab[lab["experiment_cohort"] == cohort]
        n = len(g)
        if n == 0:
            lines.append(f"| {cohort} | 0 | | | |")
            continue
        mae_ai = g["delta_ai_cal"].mean()
        mae_db = g["delta_db_cal"].mean() if g["delta_db_cal"].notna().any() else float("nan")
        delta = mae_ai - mae_db
        lines.append(f"| {cohort} | {n} | {fmt(mae_ai)} | {fmt(mae_db)} | {fmt(delta)} |")
    return "\n".join(lines)


def meal_source_table(lab: pd.DataFrame) -> str:
    lines = ["| Source | n | MAE A1.0 |", "|--------|---|----------|"]
    if "meal_source" not in lab.columns:
        lines.append("| HOME_COOKED (S1) | | |")
        lines.append("| RESTAURANT (S2) | | |")
        return "\n".join(lines)
    for src, label in [("HOME_COOKED", "HOME_COOKED (S1)"), ("RESTAURANT", "RESTAURANT (S2)")]:
        g = lab[lab["meal_source"] == src]
        lines.append(f"| {label} | {len(g)} | {fmt(g['delta_ai_cal'].mean() if len(g) else float('nan'))} |")
    return "\n".join(lines)


def bucket_table(lab: pd.DataFrame) -> str:
    lines = [
        "| Bucket | n | MAE A1.0 | MAE A1.1 |",
        "|--------|---|----------|----------|",
    ]
    if "db_match_score" not in lab.columns:
        for b in ("none (0)", "low (1–8)", "mid (9–14)", "high (15+)"):
            lines.append(f"| {b} | | | |")
        return "\n".join(lines)
    scored = lab.copy()
    scored["bucket"] = pd.cut(
        scored["db_match_score"].fillna(0),
        bins=[-1, 0, 8, 14, 1000],
        labels=["none (0)", "low (1–8)", "mid (9–14)", "high (15+)"],
    )
    for bucket in ["none (0)", "low (1–8)", "mid (9–14)", "high (15+)"]:
        g = scored[scored["bucket"] == bucket]
        lines.append(
            f"| {bucket} | {len(g)} | {fmt(g['delta_ai_cal'].mean() if len(g) else float('nan'))} | "
            f"{fmt(g['delta_db_cal'].mean() if len(g) and g['delta_db_cal'].notna().any() else float('nan'))} |"
        )
    return "\n".join(lines)


def branch_decision(lab: pd.DataFrame) -> str:
    if len(lab) == 0:
        return "Insufficient data — collect PT labels first."
    delta_a = lab["delta_ai_cal"].mean() - lab["delta_db_cal"].mean()
    p_val = None
    if len(lab) >= 5:
        try:
            from scipy.stats import wilcoxon

            paired = lab.dropna(subset=["delta_ai_cal", "delta_db_cal"])
            if len(paired) >= 5:
                _, p_val = wilcoxon(paired["delta_ai_cal"], paired["delta_db_cal"])
        except ImportError:
            pass
    if delta_a > 0 and p_val is not None and p_val < 0.05:
        return "**Improve** — ΔA > 0 và Wilcoxon p < 0.05"
    if delta_a > 0:
        return "**Improve (tentative)** — ΔA > 0; cần thêm mẫu hoặc kiểm định"
    return "**Apply** — hybrid không cải thiện; báo MAE A1.0 + giải thích DB/match"


def fill_template(df: pd.DataFrame) -> str:
    lab = labeled(df)
    n = len(lab)
    mae_ai = lab["delta_ai_cal"].mean() if n else float("nan")
    mae_db = lab["delta_db_cal"].mean() if n and lab["delta_db_cal"].notna().any() else float("nan")
    delta_a = mae_ai - mae_db if n else float("nan")
    mean_pt = lab["pt_cal"].mean() if n and "pt_cal" in lab.columns else float("nan")
    mae_pct = (mae_ai / mean_pt * 100) if n and mean_pt else float("nan")
    rmse_ai = rmse_series(lab["ai_cal"], lab["pt_cal"]) if n else float("nan")
    rmse_db = rmse_series(lab["db_cal"], lab["pt_cal"]) if n and lab["db_cal"].notna().any() else float("nan")

    text = TEMPLATE.read_text(encoding="utf-8")
    today = pd.Timestamp.now().strftime("%Y-%m-%d")
    text = re.sub(
        r"\*Template v[\d.]+.*?\*",
        f"*Filled {today} — n={n} labeled*",
        text,
        count=1,
    )

    table1_rows = [
        "| Model | Role | MAE (kcal) | MAE% | RMSE (kcal) | F1 (food) |",
        "|-------|------|------------|------|-------------|-----------|",
        f"| **A1.0** | ResNet + macro cố định | {fmt(mae_ai)} | {fmt(mae_pct)}% | {fmt(rmse_ai)} | _offline_ |",
        f"| **A1.1** | ResNet + NutriHome grounding | {fmt(mae_db)} | — | {fmt(rmse_db)} | _offline_ |",
        f"| **ΔA** | GAP (A1.0 − A1.1) | {fmt(delta_a)} | — | — | — |",
    ]
    table1 = "\n".join(table1_rows)

    text = re.sub(
        r"\| Model \| Role \| MAE \(kcal\) \| MAE% \| RMSE \(kcal\) \| F1 \(food\) \|\n"
        r"\|[-| ]+\|\n"
        r"\| \*\*A1\.0\*\*.*?\n"
        r"\| \*\*A1\.1\*\*.*?\n"
        r"\| \*\*ΔA\*\*.*?\n",
        table1 + "\n",
        text,
        count=1,
    )

    # Table 2
    t2_start = "## Table 2 — By experiment_cohort (H3)"
    t3_start = "## Table 3 — By meal_source (H4)"
    t2_block = cohort_table(lab)
    text = re.sub(
        r"(## Table 2 — By experiment_cohort \(H3\)\n\n)(.*?)(\n\n---\n\n## Table 3)",
        rf"\1{t2_block}\3",
        text,
        flags=re.DOTALL,
    )

    t3_block = meal_source_table(lab)
    text = re.sub(
        r"(## Table 3 — By meal_source \(H4\)\n\n)(.*?)(\n\n---\n\n## Table 4)",
        rf"\1{t3_block}\3",
        text,
        flags=re.DOTALL,
    )

    t4_block = bucket_table(lab)
    text = re.sub(
        r"(## Table 4 — db_match_score buckets \(H2\)\n\n)(.*?)(\n\n---\n\n## Branch decision)",
        rf"\1{t4_block}\3",
        text,
        flags=re.DOTALL,
    )

    branch = branch_decision(lab)
    text = re.sub(
        r"(## Branch decision\n\n)(.*?)(\n\n---\n\n## Narrative prompts)",
        rf"\1{branch}\3",
        text,
        flags=re.DOTALL,
    )

    return text


def main() -> int:
    parser = argparse.ArgumentParser(description="Fill RESULTS_TEMPLATE.md from CSV")
    parser.add_argument("csv", type=Path, help="RBL export CSV path")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=OUTPUT_RBL / "RESULTS_FILLED.md",
        help="Output path (default: research/output/rbl/RESULTS_FILLED.md)",
    )
    args = parser.parse_args()
    if not args.csv.exists():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1
    df = load_csv(args.csv)
    filled = fill_template(df)
    args.output.write_text(filled, encoding="utf-8")
    print(f"Filled {args.output} ({len(labeled(df))} labeled rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
