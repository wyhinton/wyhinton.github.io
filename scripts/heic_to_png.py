#!/usr/bin/env python3
"""
heic_to_png.py

Convert all .HEIC / .heic images in a folder to .PNG.

Usage:
    python scripts/heic_to_png.py <folder_path>
    python scripts/heic_to_png.py <folder_path> --delete-originals

Options:
    --delete-originals   Remove the source .heic files after successful conversion

Dependencies:
    pip install pillow pillow-heif
"""

import argparse
import sys
from pathlib import Path

# ── Dependency check ──────────────────────────────────────────────────────────
try:
    from PIL import Image
    import pillow_heif
except ImportError:
    sys.exit(
        "❌  Required packages are missing.\n"
        "    Install them with:\n\n"
        "        pip install pillow pillow-heif\n"
    )

# Register the HEIF/HEIC opener so Pillow can read HEIC files transparently
pillow_heif.register_heif_opener()

# ── Core logic ─────────────────────────────────────────────────────────────────

def convert_folder(folder: Path, delete_originals: bool = False) -> None:
    heic_files = sorted(
        f for f in folder.iterdir()
        if f.is_file() and f.suffix.lower() in {".heic", ".heif"}
    )

    if not heic_files:
        print(f"⚠️   No .HEIC / .HEIF files found in: {folder}")
        return

    print(f"\n🔄  Converting {len(heic_files)} file(s) in: {folder}\n")

    ok, failed = 0, 0
    for heic_path in heic_files:
        png_path = heic_path.with_suffix(".png")
        try:
            with Image.open(heic_path) as img:
                img.convert("RGBA").save(png_path, "PNG")

            size_kb = png_path.stat().st_size // 1024
            print(f"  ✅  {heic_path.name}  →  {png_path.name}  ({size_kb} KB)")

            if delete_originals:
                heic_path.unlink()
                print(f"       🗑️  Deleted original: {heic_path.name}")

            ok += 1
        except Exception as exc:
            print(f"  ❌  {heic_path.name}  —  {exc}")
            failed += 1

    print(f"\n{'─'*50}")
    print(f"  Done — {ok} converted, {failed} failed.")
    if ok:
        print(f"  📁  PNGs saved to: {folder}")
    print()


# ── CLI ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert all .HEIC images in a folder to .PNG"
    )
    parser.add_argument(
        "folder",
        help="Path to the folder containing .HEIC files",
    )
    parser.add_argument(
        "--delete-originals",
        action="store_true",
        help="Delete the original .HEIC files after successful conversion",
    )
    args = parser.parse_args()

    folder = Path(args.folder).expanduser().resolve()
    if not folder.exists():
        sys.exit(f"❌  Folder not found: {folder}")
    if not folder.is_dir():
        sys.exit(f"❌  Not a folder: {folder}")

    convert_folder(folder, delete_originals=args.delete_originals)


if __name__ == "__main__":
    main()
