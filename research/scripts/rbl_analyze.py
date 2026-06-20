#!/usr/bin/env python3
"""
NutriCan RBL analysis — A1.0 vs A1.1 (Improve 2.2)
Based on KE_HOACH_RESEARCH_IMPROVE_NUTRICAN.md §8
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

LABELED_ACTIONS = {"APPROVE", "ADJUST", "ADJUST_MACROS"}


def load_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, comment="#")


def labeled(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["pt_action"].isin(LABELED_ACTIONS)].copy()


def mae_series(a: pd.Series, b: pd.Series) -> float:
    mask = a.notna() & b.notna()
    if mask.sum() == 0:
        return float("nan")
    return (a[mask] - b[mask]).abs().mean()


def rmse_series(a: pd.Series, b: pd.Series) -> float:
    mask = a.notna() & b.notna()
    if mask.sum() == 0:
        return float("nan")
    return np.sqrt(((a[mask] - b[mask]) ** 2).mean())


def bootstrap_delta_a_ci(
    paired: pd.DataFrame,
    *,
    n_boot: int = 10_000,
    ci: float = 0.95,
    seed: int = 42,
) -> tuple[float, float, float]:
    """Bootstrap 95% CI for ΔA = mean(|A1.0−PT|) − mean(|A1.1−PT|) on paired rows."""
    if len(paired) < 2:
        return float("nan"), float("nan"), float("nan")
    rng = np.random.default_rng(seed)
    ai = paired["delta_ai_cal"].to_numpy(dtype=float)
    db = paired["delta_db_cal"].to_numpy(dtype=float)
    n = len(ai)
    boots = np.empty(n_boot, dtype=float)
    for i in range(n_boot):
        idx = rng.integers(0, n, size=n)
        boots[i] = ai[idx].mean() - db[idx].mean()
    point = ai.mean() - db.mean()
    alpha = (1 - ci) / 2
    lo, hi = np.quantile(boots, [alpha, 1 - alpha])
    return point, float(lo), float(hi)


def analyze(df: pd.DataFrame) -> str:
    lab = labeled(df)
    n = len(lab)
    lines: list[str] = []
    lines.append("# NutriCan RBL Analysis Results\n")
    lines.append(f"- Labeled samples (APPROVE/ADJUST): **{n}**")
    lines.append(f"- Insufficient sample (<30): **{n < 30}**\n")

    if n == 0:
        lines.append("No labeled rows — collect PT reviews first.")
        return "\n".join(lines)

    mae_ai = lab["delta_ai_cal"].mean()
    mae_db = lab["delta_db_cal"].mean()
    delta_a = mae_ai - mae_db
    mean_pt_cal = lab["pt_cal"].mean()
    mae_pct = (mae_ai / mean_pt_cal * 100) if mean_pt_cal else float("nan")

    lines.append("## A1.0 vs A1.1 (global)\n")
    lines.append("| Model | MAE (kcal) | MAE% | RMSE (kcal) |")
    lines.append("|-------|------------|------|-------------|")
    lines.append(
        f"| A1.0 (ResNet50 + mock macros) | {mae_ai:.1f} | {mae_pct:.1f}% | "
        f"{rmse_series(lab['ai_cal'], lab['pt_cal']):.1f} |"
    )
    db_rmse = rmse_series(lab["db_cal"], lab["pt_cal"]) if lab["db_cal"].notna().any() else float("nan")
    lines.append(f"| A1.1 (Hybrid DB) | {mae_db:.1f} | — | {db_rmse:.1f} |")
    lines.append(f"| **ΔA** | **{delta_a:.1f}** | — | — |\n")
    lines.append("> Paper 1 Tupc MAE% ≈ 37.5% — reference magnitude only.\n")

    lines.append("## Per-macro MAE\n")
    for m, ai_col, db_col, pt_col in [
        ("calories", "ai_cal", "db_cal", "pt_cal"),
        ("protein", "ai_pro", "db_pro", "pt_pro"),
        ("carb", "ai_carb", "db_carb", "pt_carb"),
        ("fat", "ai_fat", "db_fat", "pt_fat"),
    ]:
        if pt_col in lab.columns:
            lines.append(
                f"- {m}: A1.0={mae_series(lab[ai_col], lab[pt_col]):.1f}, "
                f"A1.1={mae_series(lab[db_col], lab[pt_col]):.1f}"
            )

    if "db_match_score" in lab.columns:
        lines.append("\n## H2 — by db_match_score bucket\n")
        scored = lab.copy()
        scored["bucket"] = pd.cut(
            scored["db_match_score"].fillna(0),
            bins=[-1, 0, 8, 14, 1000],
            labels=["none", "low", "mid", "high"],
        )
        grp = scored.groupby("bucket", observed=True)[["delta_ai_cal", "delta_db_cal"]].mean()
        lines.append(grp.to_markdown())

    if "experiment_cohort" in lab.columns:
        lines.append("\n## H3 — ΔA by experiment_cohort\n")
        cohort_delta = lab.groupby("experiment_cohort").apply(
            lambda g: g["delta_ai_cal"].mean() - g["delta_db_cal"].mean(),
            include_groups=False,
        )
        lines.append(cohort_delta.to_markdown())

    if "model_version" in lab.columns:
        models = lab["model_version"].dropna().unique().tolist()
        lines.append(f"\n## Model versions in export\n")
        lines.append(f"- {', '.join(str(m) for m in models)}\n")

    if "meal_source" in lab.columns:
        lines.append("\n## H4 — A1.0 MAE by meal_source\n")
        by_source = lab.groupby("meal_source")["delta_ai_cal"].mean()
        lines.append(by_source.to_markdown())

    if "pt_correction_reason" in lab.columns:
        wrong_food_rate = (lab["pt_correction_reason"] == "WRONG_FOOD").mean()
        top1 = 1 - wrong_food_rate
        lines.append(f"\n## Top-1 food recognition (proxy)\n")
        lines.append(f"- Top-1 accuracy ≈ **{top1:.1%}** (1 − WRONG_FOOD rate)\n")

    if "blind_cal" in lab.columns and lab["blind_cal"].notna().any():
        blind = lab[lab["blind_cal"].notna()]
        blind_mae = mae_series(blind["blind_cal"], blind["pt_cal"])
        lines.append(f"## Blind PT vs ground truth MAE: **{blind_mae:.1f}** kcal (n={len(blind)})\n")

    paired = lab.dropna(subset=["delta_ai_cal", "delta_db_cal"])
    if len(paired) >= 2:
        point, lo, hi = bootstrap_delta_a_ci(paired)
        lines.append("## Bootstrap 95% CI for ΔA\n")
        lines.append(f"- Point estimate: **{point:.1f}** kcal")
        lines.append(f"- 95% CI: **[{lo:.1f}, {hi:.1f}]** kcal (10k resamples, paired rows)\n")

    if len(paired) >= 5:
        try:
            from scipy.stats import wilcoxon

            stat, p = wilcoxon(paired["delta_ai_cal"], paired["delta_db_cal"])
            lines.append("## Wilcoxon paired test (|A1.0−PT| vs |A1.1−PT|)\n")
            lines.append(f"- n={len(paired)}, statistic={stat:.2f}, p={p:.4f}")
            lines.append(f"- Significant (p<0.05): **{'yes' if p < 0.05 else 'no'}**\n")
        except ImportError:
            pass
    elif len(paired) >= 2:
        lines.append("## Wilcoxon paired test\n")
        lines.append(f"- Skipped (need n≥5, have n={len(paired)})\n")

    branch = "Improve (ΔA > 0)" if delta_a > 0 else "Apply (explain why hybrid did not help)"
    lines.append(f"\n## Branch recommendation: **{branch}**")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze NutriCan RBL CSV export")
    parser.add_argument("csv", type=Path, help="Path to rbl_export.csv")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("research/output/rbl_results.md"),
        help="Output markdown path",
    )
    args = parser.parse_args()

    if not args.csv.exists():
        print(f"File not found: {args.csv}", file=sys.stderr)
        return 1

    df = load_csv(args.csv)
    report = analyze(df)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding="utf-8")
    # Avoid Windows console Unicode errors (Δ, etc.)
    try:
        print(report)
    except UnicodeEncodeError:
        print(report.encode("ascii", errors="replace").decode("ascii"))
    print(f"\nWritten to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
