#!/usr/bin/env python3
"""Generate small (Twitter-sized) variants of every public/og-*.jpg.

Run after adding or updating an OG banner:

    python scripts/generate-og-variants.py

For each `public/og-<name>.jpg` (1200×630 source), this writes
`public/og-<name>-sm.jpg` at 800×418 — the size Twitter/X recommends for
`summary_large_image`. Files are encoded as progressive JPEGs at quality 82
to stay well under the 1 MB scraper limit.

The script is idempotent: re-running it overwrites variants in place. It
skips files that are already small variants (have the `-sm` suffix).
"""

from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"
TARGET_SIZE = (800, 418)
QUALITY = 82


def main() -> int:
    if not PUBLIC_DIR.exists():
        print(f"public/ not found at {PUBLIC_DIR}", file=sys.stderr)
        return 1

    sources = sorted(
        p for p in PUBLIC_DIR.glob("og-*.jpg") if not p.stem.endswith("-sm")
    )
    if not sources:
        print("No og-*.jpg sources found.")
        return 0

    written = 0
    for src in sources:
        dest = src.with_name(f"{src.stem}-sm.jpg")
        with Image.open(src) as im:
            im = im.convert("RGB")
            im.thumbnail((4000, 4000))  # noop unless huge
            resized = im.resize(TARGET_SIZE, Image.LANCZOS)
            resized.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        size_kb = dest.stat().st_size / 1024
        print(f"  {src.name} → {dest.name} ({size_kb:.1f} KB)")
        written += 1

    print(f"\nGenerated {written} small OG variant(s) in {PUBLIC_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
