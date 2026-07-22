#!/usr/bin/env python3
"""Strip // and /* */ comments from Java source without touching string/char/text-block literals."""

from __future__ import annotations

import sys
from pathlib import Path

SKIP_DIRS = {"target", "build", ".git", "node_modules", "dist"}


def strip_java_comments(src: str) -> str:
    out: list[str] = []
    i = 0
    n = len(src)
    in_line = False
    in_block = False
    in_string = False
    in_char = False
    in_text_block = False
    # Track whether current line has non-whitespace content (for dropping full-line comments)
    line_has_code = False

    def drop_trailing_ws() -> None:
        while out and out[-1] in " \t":
            out.pop()

    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""

        if in_line:
            if c == "\n":
                in_line = False
                if line_has_code:
                    out.append(c)
                line_has_code = False
            i += 1
            continue

        if in_block:
            if c == "*" and nxt == "/":
                in_block = False
                i += 2
            else:
                if c == "\n":
                    # Drop blank lines created solely by block comments
                    line_has_code = False
                i += 1
            continue

        if in_text_block:
            out.append(c)
            if c == '"' and i + 2 < n and src[i : i + 3] == '"""':
                out.append(src[i + 1])
                out.append(src[i + 2])
                in_text_block = False
                i += 3
            else:
                i += 1
            continue

        if in_string:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == '"':
                in_string = False
            i += 1
            continue

        if in_char:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == "'":
                in_char = False
            i += 1
            continue

        if c == "/" and nxt == "/":
            if not line_has_code:
                drop_trailing_ws()
            else:
                drop_trailing_ws()
            in_line = True
            i += 2
            continue

        if c == "/" and nxt == "*":
            if not line_has_code:
                drop_trailing_ws()
            else:
                drop_trailing_ws()
            in_block = True
            i += 2
            continue

        if c == '"' and i + 2 < n and src[i : i + 3] == '"""':
            in_text_block = True
            line_has_code = True
            out.append('"""')
            i += 3
            continue

        if c == '"':
            in_string = True
            line_has_code = True
            out.append(c)
            i += 1
            continue

        if c == "'":
            in_char = True
            line_has_code = True
            out.append(c)
            i += 1
            continue

        if c == "\n":
            out.append(c)
            line_has_code = False
            i += 1
            continue

        if c not in " \t":
            line_has_code = True

        out.append(c)
        i += 1

    text = "".join(out)
    # Collapse 3+ consecutive blank lines -> 2
    while "\n\n\n\n" in text:
        text = text.replace("\n\n\n\n", "\n\n\n")
    return text


def should_skip(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


def process_tree(root: Path) -> tuple[int, int]:
    changed = 0
    scanned = 0
    for path in sorted(root.rglob("*.java")):
        if should_skip(path):
            continue
        scanned += 1
        original = path.read_text(encoding="utf-8")
        stripped = strip_java_comments(original)
        if not stripped.endswith("\n") and original.endswith("\n"):
            stripped += "\n"
        if stripped != original:
            path.write_text(stripped, encoding="utf-8", newline="\n")
            changed += 1
            print(f"  cleaned: {path.as_posix()}")
    return scanned, changed


def main() -> int:
    roots = [Path(p) for p in sys.argv[1:]] or [Path("nutrican-be")]
    total_scanned = total_changed = 0
    for root in roots:
        print(f"Scanning Java under {root} ...")
        scanned, changed = process_tree(root)
        total_scanned += scanned
        total_changed += changed
        print(f"  scanned={scanned} changed={changed}")
    print(f"Done. scanned={total_scanned} changed={total_changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
