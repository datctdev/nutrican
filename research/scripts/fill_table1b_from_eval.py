#!/usr/bin/env python3
"""Fill Table 1b in RESULTS_TEMPLATE.md from resnet50_eval_*.json or resnet50_compare.json."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from repo_paths import OUTPUT_EVAL, REPO_ROOT

TEMPLATE = REPO_ROOT / "docs" / "research" / "RESULTS_TEMPLATE.md"


def pct(acc: float | None) -> str:
    if acc is None:
        return "_n/a_"
    return f"{acc * 100:.2f}%"


def load_compare() -> dict:
    compare_path = OUTPUT_EVAL / "resnet50_compare.json"
    if compare_path.exists():
        return json.loads(compare_path.read_text(encoding="utf-8"))
    out: dict = {}
    for tag in ("phase1", "phase2"):
        p = OUTPUT_EVAL / f"resnet50_eval_{tag}.json"
        if p.exists():
            out[tag] = json.loads(p.read_text(encoding="utf-8"))
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", type=Path, default=TEMPLATE)
    args = parser.parse_args()

    data = load_compare()
    if not data:
        print("No eval JSON found — run eval_resnet50.py first", file=__import__("sys").stderr)
        return 1

    p1 = data.get("phase1", {}).get("top1_accuracy")
    p2 = data.get("phase2", {}).get("top1_accuracy")
    delta = (p2 - p1) if p1 is not None and p2 is not None else None

    text = args.template.read_text(encoding="utf-8")
    table = (
        "| Config | Bohlol ref | NutriCan offline (`eval_resnet50.py`) |\n"
        "|--------|------------|----------------------------------------|\n"
        f"| ResNet no FC / phase1 | ~70% Acc (narrative) | {pct(p1)} |\n"
        f"| ResNet-50S / phase2 (Bohlol FC head) | 97.25% Acc, F1 97% | {pct(p2)} |\n"
        f"| ΔAcc (Improve CV) | — | {pct(delta) if delta is not None else '_pending phase2_'} |"
    )
    text = re.sub(
        r"\| Config \| Bohlol ref \| NutriCan offline.*?\n"
        r"\|[-| ]+\|\n"
        r"\| ResNet no FC / phase1.*?\n"
        r"\| ResNet-50S / phase2.*?\n"
        r"\| ΔAcc \(Improve CV\).*?\n",
        table + "\n",
        text,
        count=1,
        flags=re.DOTALL,
    )
    args.template.write_text(text, encoding="utf-8")
    print(f"Updated Table 1b in {args.template}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
