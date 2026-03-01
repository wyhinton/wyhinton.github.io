#!/usr/bin/env python3
"""
Create a new blog post with interactive prompts.
This script guides you through creating a new Jekyll blog post with proper frontmatter,
and automatically creates the corresponding image folder.
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import re


def get_script_dir():
    """Get the directory where this script is located."""
    return Path(__file__).parent.resolve()


def get_project_root():
    """Get the root directory of the Jekyll project."""
    return get_script_dir().parent


def slugify(text):
    """Convert text to a URL-friendly slug."""
    # Convert to lowercase and replace spaces with hyphens
    slug = text.lower().strip()
    # Replace spaces and underscores with hyphens
    slug = re.sub(r'[\s_]+', '-', slug)
    # Remove any non-alphanumeric characters except hyphens
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    # Remove multiple consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug


def get_user_input(prompt, default=None, validate_fn=None):
    """
    Get user input with optional default value and validation.
    
    Args:
        prompt: The prompt to display
        default: Default value if user just presses enter
        validate_fn: Optional function to validate input
    
    Returns:
        The user's input or default value
    """
    if default:
        display_prompt = f"{prompt} [{default}]: "
    else:
        display_prompt = f"{prompt}: "
    
    while True:
        user_input = input(display_prompt).strip()
        
        if not user_input:
            if default:
                user_input = default
            else:
                print("❌ Input cannot be empty. Please try again.")
                continue
        
        if validate_fn and not validate_fn(user_input):
            print("❌ Invalid input. Please try again.")
            continue
        
        return user_input


def get_post_details():
    """Interactively gather post details from user."""
    print("\n📝 Creating a new blog post...\n")
    
    # Get title
    title = get_user_input("Post title")
    
    # Get slug (auto-generate from title, allow override)
    auto_slug = slugify(title)
    slug = get_user_input(f"Post slug (URL-friendly name)", auto_slug)
    
    # Get date (default to today)
    today = datetime.now().strftime("%Y-%m-%d")
    date_input = get_user_input("Post date (YYYY-MM-DD)", today)
    
    # Validate date format
    try:
        datetime.strptime(date_input, "%Y-%m-%d")
    except ValueError:
        print("❌ Invalid date format. Using today's date instead.")
        date_input = today
    
    # Get categories
    categories_input = get_user_input("Categories (comma-separated)", "")
    categories = [cat.strip() for cat in categories_input.split(",")] if categories_input else []
    
    # Get tags
    tags_input = get_user_input("Tags (comma-separated)", "")
    tags = [tag.strip() for tag in tags_input.split(",")] if tags_input else []
    
    # Get excerpt/description
    excerpt = get_user_input("Brief excerpt or description (optional)", "")
    
    return {
        "title": title,
        "slug": slug,
        "date": date_input,
        "categories": categories,
        "tags": tags,
        "excerpt": excerpt
    }


def create_post_file(post_details):
    """Create the markdown file for the new post."""
    root = get_project_root()
    posts_dir = root / "_posts"
    
    # Create filename with date prefix
    filename = f"{post_details['date']}-{post_details['slug']}.md"
    filepath = posts_dir / filename
    
    # Check if file already exists
    if filepath.exists():
        overwrite = input(f"\n⚠️  File {filename} already exists. Overwrite? (y/n): ").lower()
        if overwrite != 'y':
            print("❌ Aborted. File not created.")
            return None
    
    # Build frontmatter
    frontmatter = f"""---
layout: post
title: "{post_details['title']}"
date: {post_details['date']}
"""
    
    if post_details['categories']:
        categories_str = ", ".join(post_details['categories'])
        frontmatter += f"categories: [{categories_str}]\n"
    
    if post_details['tags']:
        tags_str = ", ".join(post_details['tags'])
        frontmatter += f"tags: [{tags_str}]\n"
    
    if post_details['excerpt']:
        frontmatter += f'excerpt: "{post_details["excerpt"]}"\n'
    
    frontmatter += """---

"""
    
    # Create the file with frontmatter only
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(frontmatter)
        print(f"✅ Created post file: {filename}")
        return filepath
    except Exception as e:
        print(f"❌ Error creating post file: {e}")
        return None


def create_image_folder(post_details):
    """Create the image folder for the post."""
    root = get_project_root()
    images_dir = root / "assets" / "images" / "posts" / post_details['slug']
    
    try:
        images_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created image folder: assets/images/posts/{post_details['slug']}")
        return images_dir
    except Exception as e:
        print(f"❌ Error creating image folder: {e}")
        return None


def print_next_steps(post_details, filepath, images_dir):
    """Print helpful next steps for the user."""
    print(f"\n{'='*60}")
    print("🎉 Post created successfully!")
    print(f"{'='*60}\n")
    
    print(f"📄 Post file: {filepath}\n")
    
    print("📸 Image folder: " + str(images_dir))
    print("   Add your images here and reference them in your post using:")
    print('   {% include post_image.html name="image.png" alt="Description" %}\n')
    
    print("📝 Next steps:")
    print("   1. Open the post file and add your content")
    print("   2. Add images to the image folder")
    print("   3. Reference images in your post using the post_image include")
    print("   4. Run 'npm run build' to preview your post\n")
    
    print(f"📋 Post details:")
    print(f"   Title: {post_details['title']}")
    print(f"   Slug: {post_details['slug']}")
    print(f"   Date: {post_details['date']}")
    if post_details['categories']:
        print(f"   Categories: {', '.join(post_details['categories'])}")
    if post_details['tags']:
        print(f"   Tags: {', '.join(post_details['tags'])}\n")


def main():
    """Main entry point."""
    try:
        # Get project root to verify we're in the right place
        root = get_project_root()
        posts_dir = root / "_posts"
        
        if not posts_dir.exists():
            print("❌ Error: _posts directory not found.")
            print("   Please run this script from the Jekyll project root.")
            sys.exit(1)
        
        # Get post details from user
        post_details = get_post_details()
        
        # Create post file
        filepath = create_post_file(post_details)
        if not filepath:
            sys.exit(1)
        
        # Create image folder
        images_dir = create_image_folder(post_details)
        
        # Print next steps
        print_next_steps(post_details, filepath, images_dir)
        
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
