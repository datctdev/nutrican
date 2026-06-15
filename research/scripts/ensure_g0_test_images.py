#!/usr/bin/env python3
"""Ensure G0 test images exist (pho + pizza for HYBRID/AI_ONLY checks)."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DIR = REPO_ROOT / "research" / "seed" / "test"


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def write_minimal_png(path: Path, rgb: tuple[int, int, int], size: int = 128) -> None:
    """Minimal valid PNG — llava needs real dimensions, not 1x1 JPEG."""
    r, g, b = rgb
    raw = b""
    row = bytes([0] + [r, g, b] * size)
    for _ in range(size):
        raw += row
    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += _png_chunk(b"IHDR", ihdr)
    png += _png_chunk(b"IDAT", compressed)
    png += _png_chunk(b"IEND", b"")
    path.write_bytes(png)


def ensure_images() -> None:
    TEST_DIR.mkdir(parents=True, exist_ok=True)
    # Warm bowl tones (pho-ish) and pizza-ish red/brown
    targets = {
        "smoke_pho.jpg": None,  # prefer real file if user adds it
        "smoke_pizza.jpg": None,
    }
    for name in ("smoke_pho.png", "smoke_pizza.png"):
        p = TEST_DIR / name
        if p.exists() and p.stat().st_size > 1000:
            continue
        if "pho" in name:
            write_minimal_png(p, (180, 120, 70), 256)
        else:
            write_minimal_png(p, (200, 80, 40), 256)
        print(f"Created placeholder {p}")


if __name__ == "__main__":
    ensure_images()
