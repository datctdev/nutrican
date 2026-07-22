#!/usr/bin/env python3
"""Strip // and /* */ from JS/TS/JSX while preserving strings, templates, and regex-ish literals."""

from __future__ import annotations

import sys
from pathlib import Path

SKIP_DIRS = {
    "node_modules",
    "dist",
    "build",
    ".git",
    "target",
    "test-results",
    "playwright-report",
}


def strip_js_comments(src: str) -> str:
    out: list[str] = []
    i = 0
    n = len(src)
    in_line = False
    in_block = False
    in_single = False
    in_double = False
    in_template = False
    in_regex = False
    line_has_code = False
    template_depth = 0  # ${ } nesting inside templates

    def drop_trailing_ws() -> None:
        while out and out[-1] in " \t":
            out.pop()

    def prev_non_ws() -> str:
        for ch in reversed(out):
            if ch not in " \t\r\n":
                return ch
        return ""

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
                    line_has_code = False
                i += 1
            continue

        if in_single:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == "'":
                in_single = False
            i += 1
            continue

        if in_double:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == '"':
                in_double = False
            i += 1
            continue

        if in_template:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == "`" and template_depth == 0:
                in_template = False
                i += 1
                continue
            if c == "$" and nxt == "{":
                template_depth += 1
                out.append("{")
                i += 2
                continue
            if c == "}" and template_depth > 0:
                template_depth -= 1
                i += 1
                continue
            i += 1
            continue

        if in_regex:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(src[i + 1])
                i += 2
                continue
            if c == "/":
                in_regex = False
                # flags
                i += 1
                while i < n and src[i].isalpha():
                    out.append(src[i])
                    i += 1
                continue
            if c == "\n":
                in_regex = False
            i += 1
            continue

        # Normal mode — also handle nested code inside template ${} via template_depth==0 only;
        # when template_depth>0 we already stay in_template. Good.

        # JSX expression comment: {/* ... */} — drop braces + comment entirely
        if c == "{":
            j = i + 1
            while j < n and src[j] in " \t":
                j += 1
            if j + 1 < n and src[j] == "/" and src[j + 1] == "*":
                drop_trailing_ws()
                j += 2
                while j + 1 < n and not (src[j] == "*" and src[j + 1] == "/"):
                    if src[j] == "\n":
                        line_has_code = False
                    j += 1
                if j + 1 < n:
                    j += 2  # */
                while j < n and src[j] in " \t":
                    j += 1
                if j < n and src[j] == "}":
                    j += 1
                i = j
                continue

        if c == "/" and nxt == "/":
            drop_trailing_ws()
            in_line = True
            i += 2
            continue

        if c == "/" and nxt == "*":
            drop_trailing_ws()
            in_block = True
            i += 2
            continue

        if c == "/":
            # Division vs regex: heuristic
            p = prev_non_ws()
            if p in {
                "",
                "(",
                ",",
                "=",
                ":",
                "[",
                "!",
                "&",
                "|",
                "?",
                "+",
                "-",
                "*",
                "%",
                "~",
                "^",
                "{",
                ";",
                "}",
                "\n",
                "return",
            } or (len(out) >= 6 and "".join(out[-6:]).rstrip().endswith("return")):
                # check keyword return more carefully
                in_regex = True
                out.append(c)
                line_has_code = True
                i += 1
                continue

        if c == "'":
            in_single = True
            line_has_code = True
            out.append(c)
            i += 1
            continue
        if c == '"':
            in_double = True
            line_has_code = True
            out.append(c)
            i += 1
            continue
        if c == "`":
            in_template = True
            template_depth = 0
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
    while "\n\n\n\n" in text:
        text = text.replace("\n\n\n\n", "\n\n\n")
    return text


def should_skip(path: Path) -> bool:
    return any(part in SKIP_DIRS for part in path.parts)


def process(root: Path, patterns: tuple[str, ...]) -> tuple[int, int]:
    scanned = changed = 0
    files: list[Path] = []
    for pat in patterns:
        files.extend(root.rglob(pat))
    for path in sorted(set(files)):
        if should_skip(path):
            continue
        scanned += 1
        original = path.read_text(encoding="utf-8")
        stripped = strip_js_comments(original)
        if not stripped.endswith("\n") and original.endswith("\n"):
            stripped += "\n"
        if stripped != original:
            path.write_text(stripped, encoding="utf-8", newline="\n")
            changed += 1
            print(f"  cleaned: {path.as_posix()}")
    return scanned, changed


def main() -> int:
    roots = [Path(p) for p in sys.argv[1:]] or [Path("e2e")]
    total_s = total_c = 0
    for root in roots:
        print(f"Scanning JS/TS under {root} ...")
        s, c = process(root, ("*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs"))
        total_s += s
        total_c += c
        print(f"  scanned={s} changed={c}")
    print(f"Done. scanned={total_s} changed={total_c}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
