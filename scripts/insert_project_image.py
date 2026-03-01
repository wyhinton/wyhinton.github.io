#!/usr/bin/env python3
"""
insert_project_image.py

Interactive helper that:
  1. Resolves the slug for a _posts/*.md file
  2. Lists images in the matching assets/images/posts/<slug>/ folder
  3. Prompts the user to pick one and fill in optional alt/caption
  4. Prints the ready-to-paste Liquid include snippet AND copies it to the clipboard

Usage (standalone):
    python scripts/insert_project_image.py
    python scripts/insert_project_image.py _posts/2026-03-01-component-harvest-power-strip.md

The VS Code task "🖼️ Insert Post Image" passes ${file} automatically.
"""

import os
import re
import sys
import subprocess
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parent
ROOT_DIR     = SCRIPT_DIR.parent
POSTS_DIR    = ROOT_DIR / "_posts"
IMAGES_BASE  = ROOT_DIR / "assets" / "images" / "posts"

IMAGE_EXTS   = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif"}

# ── Helpers ────────────────────────────────────────────────────────────────────

def slug_from_filename(filename: str) -> str:
    """Turn '2026-03-01-my-post-title.md' → 'my-post-title'."""
    name = Path(filename).stem          # strip .md
    m = re.match(r"^\d{4}-\d{1,2}-\d{1,2}-(.+)$", name)
    return m.group(1) if m else name


def pick_post() -> Path:
    """Let the user choose from posts in _posts/."""
    posts = sorted(POSTS_DIR.glob("*.md"))
    if not posts:
        sys.exit("❌  No .md files found in _posts/")
    print("\n📝  Select a post:\n")
    for i, p in enumerate(posts, 1):
        print(f"  {i:>3}.  {p.name}")
    print()
    while True:
        raw = input("Enter number: ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(posts):
            return posts[int(raw) - 1]
        print("     ⚠️  Invalid choice, try again.")


def pick_image(image_dir: Path) -> str:
    """Return the filename the user picks from image_dir."""
    images = sorted(
        f for f in image_dir.iterdir()
        if f.is_file() and f.suffix.lower() in IMAGE_EXTS
    )
    if not images:
        sys.exit(f"❌  No images found in {image_dir}")

    print(f"\n🖼️   Images in  assets/images/posts/{image_dir.name}/\n")
    for i, img in enumerate(images, 1):
        print(f"  {i:>3}.  {img.name}")
    print()
    while True:
        raw = input("Select image number: ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(images):
            return images[int(raw) - 1].name
        print("     ⚠️  Invalid choice, try again.")


def build_snippet(name: str, alt: str, caption: str) -> str:
    """Build the Liquid include tag."""
    parts = [f'name="{name}"']
    if alt:
        parts.append(f'alt="{alt}"')
    if caption:
        parts.append(f'caption="{caption}"')
    return '{%' + f' include post_image.html {" ".join(parts)} ' + '%}'


def copy_to_clipboard(text: str) -> bool:
    """Copy text to the Windows clipboard via clip.exe."""
    try:
        subprocess.run("clip", input=text.encode("utf-16"), check=True)
        return True
    except Exception:
        return False


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    # 1. Resolve the post file
    if len(sys.argv) > 1:
        post_path = Path(sys.argv[1]).resolve()
        if not post_path.exists():
            sys.exit(f"❌  File not found: {post_path}")
        print(f"\n📄  Post: {post_path.name}")
    else:
        post_path = pick_post()

    slug = slug_from_filename(post_path.name)
    image_dir = IMAGES_BASE / slug

    # 2. Check the image folder exists
    if not image_dir.exists():
        print(f"\n⚠️   Image folder does not exist: {image_dir}")
        create = input("Create it now? [y/N]: ").strip().lower()
        if create == "y":
            image_dir.mkdir(parents=True, exist_ok=True)
            print(f"✅  Created: {image_dir}")
        sys.exit("Add images to the folder and re-run.")

    # 3. Pick the image
    image_name = pick_image(image_dir)

    # 4. Optional alt + caption
    print()
    default_alt = Path(image_name).stem.replace("-", " ").replace("_", " ").title()
    alt_raw = input(f'Alt text [{default_alt}]: ').strip()
    alt     = alt_raw if alt_raw else default_alt

    caption = input("Caption (leave blank to omit): ").strip()

    # 5. Build & output the snippet
    snippet = build_snippet(image_name, alt, caption)

    print(f"\n{'─'*60}")
    print(snippet)
    print(f"{'─'*60}")

    if copy_to_clipboard(snippet):
        print("\n✅  Copied to clipboard — paste it into your post!\n")
    else:
        print("\n⚠️  Could not copy to clipboard — paste the snippet above manually.\n")


if __name__ == "__main__":
    main()
