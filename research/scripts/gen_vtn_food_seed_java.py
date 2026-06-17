#!/usr/bin/env python3
"""Generate Java seed snippet for VTN_FCT_2007 foods."""
from __future__ import annotations

import csv
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CSV_PATH = REPO / "research" / "output" / "vtn_fct_2007_initializer.csv"
OUT_PATH = REPO / "research" / "output" / "vtn_fct_food_seed_snippet.java"


def main() -> None:
    lines: list[str] = []
    with CSV_PATH.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = row["name_vi"].replace("\\", "\\\\").replace('"', '\\"')
            cal = int(row["energy_cal"]) // 1000
            pro = float(row["protein_g"])
            fat = float(row["lipid_g"])
            carb = float(row["glucid_g"])
            lines.append(f'        items.add(food("{name}", {cal}, {pro}, {carb}, {fat}));')

    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(lines)} lines to {OUT_PATH}")


if __name__ == "__main__":
    main()
