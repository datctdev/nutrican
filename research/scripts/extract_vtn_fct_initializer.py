#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path

import fitz

REPO_ROOT = Path(__file__).resolve().parents[2]
PDF_PATH = Path(r"d:\FPT\SU26\SBA\project_team\research\VTN_FCT_2007.pdf")
OUTPUT_DIR = REPO_ROOT / "research" / "output"
CSV_OUT = OUTPUT_DIR / "vtn_fct_2007_initializer.csv"
JAVA_OUT = OUTPUT_DIR / "vtn_fct_2007_initializer.java"

# PDF embeds Vietnamese food names in TCVN3 (ABC); map to Unicode.
_TCVN3TAB = (
    "µ¸¶·¹¨»¾¼½Æ©ÇÊÈÉË®ÌÐÎÏÑªÒÕÓÔÖ×ÝØÜÞßãáâä«åèæçé¬êíëìîïóñòô"
    "\u00adõøö÷ùúýûüþ¡¢§£¤¥¦"
)
_UNICODE_TAB = (
    "àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ"
    "ĂÂĐÊÔƠƯ"
)
_TCVN3_EXTRA = {"−": "ư", "μ": "à"}
_TCVN3_MAP = dict(zip(_TCVN3TAB, _UNICODE_TAB, strict=True))
_TCVN3_MAP.update(_TCVN3_EXTRA)
_TCVN3_RE = re.compile("|".join(re.escape(c) for c in _TCVN3_MAP))


def tcvn3_to_unicode(text: str) -> str:
    return _TCVN3_RE.sub(lambda m: _TCVN3_MAP[m.group(0)], text)


@dataclass
class FoodRow:
    stt: int
    name_vi: str
    energy_cal: int
    protein_g: float
    lipid_g: float
    glucid_g: float
    page: int


def _to_float(raw: str) -> float:
    s = (raw or "").strip().replace(",", ".")
    if not s or s == "-":
        return 0.0
    return float(s)


def _is_invalid_food_name(name: str) -> bool:
    lowered = name.casefold()
    return (
        not name
        or "english" in lowered
        or lowered.startswith("tên tiếng")
        or lowered.startswith("tên thực phẩm")
    )


def _extract_name_vi(text: str) -> str | None:
    m_bottom = re.search(r"Vietnamese\):\s*\n(.+?)\n", text)
    if m_bottom:
        bottom = tcvn3_to_unicode(" ".join(m_bottom.group(1).split()))
        if not _is_invalid_food_name(bottom):
            return bottom

    m_legacy = re.search(r"Vietnamese\)\s*:?\s*(.+?)\s*STT:", text, re.DOTALL)
    if m_legacy:
        legacy = tcvn3_to_unicode(" ".join(m_legacy.group(1).split()))
        if not _is_invalid_food_name(legacy):
            return legacy

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for idx, line in enumerate(lines):
        if line != "STT:" or idx == 0:
            continue
        top = tcvn3_to_unicode(lines[idx - 1])
        if not _is_invalid_food_name(top) and top != "STT:":
            return top
    return None


def parse_pdf() -> list[FoodRow]:
    rows: list[FoodRow] = []
    seen: set[int] = set()

    pattern_stt = re.compile(r"STT:\s*(\d+)")
    pattern_energy = re.compile(r"Năng lượng \(Energy\s*\)\s*KCal\s*([0-9.,-]+)")
    pattern_protein = re.compile(r"Protein\s+g\s+([0-9.,-]+)")
    pattern_lipid = re.compile(r"Lipid \(Fat\)\s+g\s+([0-9.,-]+)")
    pattern_glucid = re.compile(r"Glucid \(Carbohydrate\)\s+g\s+([0-9.,-]+)")

    pdf = fitz.open(str(PDF_PATH))
    try:
        for page_idx, page in enumerate(pdf, start=1):
            text = page.get_text()
            if "STT:" not in text or "Protein" not in text:
                continue

            m_stt = pattern_stt.search(text)
            name_vi = _extract_name_vi(text)
            m_energy = pattern_energy.search(text)
            m_protein = pattern_protein.search(text)
            m_lipid = pattern_lipid.search(text)
            m_glucid = pattern_glucid.search(text)
            if not (m_stt and name_vi and m_energy and m_protein and m_lipid and m_glucid):
                continue

            stt = int(m_stt.group(1))
            if stt in seen:
                continue
            seen.add(stt)

            kcal = _to_float(m_energy.group(1))
            rows.append(
                FoodRow(
                    stt=stt,
                    name_vi=name_vi,
                    energy_cal=int(round(kcal * 1000)),
                    protein_g=_to_float(m_protein.group(1)),
                    lipid_g=_to_float(m_lipid.group(1)),
                    glucid_g=_to_float(m_glucid.group(1)),
                    page=page_idx,
                )
            )
    finally:
        pdf.close()

    rows.sort(key=lambda r: r.stt)
    return rows


def write_csv(rows: list[FoodRow]) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with CSV_OUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["stt", "name_vi", "energy_cal", "protein_g", "lipid_g", "glucid_g", "source_page"])
        for r in rows:
            writer.writerow([r.stt, r.name_vi, r.energy_cal, r.protein_g, r.lipid_g, r.glucid_g, r.page])


def write_java(rows: list[FoodRow]) -> None:
    lines: list[str] = []
    lines.append("// Auto-generated from VTN_FCT_2007.pdf")
    lines.append("// Unit: energy in cal (kcal * 1000), macros in g per 100g edible portion")
    lines.append("List<RawFoodInit> foods = List.of(")
    for i, r in enumerate(rows):
        suffix = "," if i < len(rows) - 1 else ""
        escaped = r.name_vi.replace("\\", "\\\\").replace("\"", "\\\"")
        lines.append(
            f'    new RawFoodInit({r.stt}, "{escaped}", {r.energy_cal}, {r.protein_g:.3f}, {r.lipid_g:.3f}, {r.glucid_g:.3f}){suffix}'
        )
    lines.append(");")
    JAVA_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    if not PDF_PATH.exists():
        print(f"Missing PDF: {PDF_PATH}")
        return 1

    rows = parse_pdf()
    write_csv(rows)
    write_java(rows)

    print(f"Parsed rows: {len(rows)}")
    if rows:
        print(f"STT range: {rows[0].stt}..{rows[-1].stt}")
        print(f"Sample: {rows[0]}")
    print(f"CSV: {CSV_OUT}")
    print(f"JAVA: {JAVA_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
