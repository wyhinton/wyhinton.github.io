# Post Images System

This system automatically creates organized image folders for each blog post and provides a simple Jekyll include for referencing images.

## Quick Start

1. **Create image folders for posts:**
   ```bash
   npm run create-post-folders
   ```

2. **Add images to your post's folder:**
   - Each post gets its own folder in `assets/images/posts/[post-slug]/`
   - Example: `2025-04-2-Getting-Started-With-HDK.md` → `assets/images/posts/Getting-Started-With-HDK/`

3. **Use images in your posts:**
   ```liquid
   {% include post_image.html name="screenshot.png" alt="My screenshot" %}
   ```

## How It Works

### Folder Structure
```
assets/images/posts/
├── Getting-Started-With-HDK/
│   ├── diagram.png
│   └── demo.gif
├── Tauri-DragAndDrop-Issues/
│   ├── dragdrop_demo.gif
│   └── error_screenshot.png
└── [other-post-slugs]/
```

### Post Slug Generation
The script converts post filenames to folder names:
- `2025-04-2-Getting-Started-With-HDK.md` → `Getting-Started-With-HDK`
- `2026-01-14-Tauri-DragAndDrop-Issues.md` → `Tauri-DragAndDrop-Issues`

## Jekyll Include Usage

The `post_image.html` include provides several options:

### Basic Usage
```liquid
{% include post_image.html name="image.png" %}
```

### With Alt Text
```liquid
{% include post_image.html name="screenshot.png" alt="Application screenshot" %}
```

### With Caption
```liquid
{% include post_image.html name="chart.svg" alt="Performance chart" caption="Memory usage over time" %}
```

### With CSS Classes
```liquid
{% include post_image.html name="logo.png" alt="Logo" class="small" %}
{% include post_image.html name="banner.jpg" alt="Banner" class="full-width" %}
```

### With Custom Dimensions
```liquid
{% include post_image.html name="icon.png" alt="Icon" width="64" height="64" %}
```

## Available CSS Classes

- `small` - Max width 400px
- `medium` - Max width 600px  
- `full-width` - 100% width
- Default styling includes hover effects and responsive behavior

## Workflow

1. **Create a new post** (e.g., `2026-01-15-My-New-Post.md`)
2. **Run the script** to create the image folder:
   ```bash
   npm run create-post-folders
   ```
3. **Add your images** to `assets/images/posts/My-New-Post/`
4. **Reference images** in your markdown using the include:
   ```liquid
   {% include post_image.html name="demo.gif" alt="Demo animation" %}
   ```

## Benefits

- ✅ **Organized**: Each post has its own image folder
- ✅ **Simple**: Just use the filename, no path needed
- ✅ **Automatic**: Script creates folders for all existing posts
- ✅ **Consistent**: Standardized image styling and structure
- ✅ **Responsive**: Images work well on all device sizes
- ✅ **Accessible**: Proper alt text and semantic HTML

## Manual Folder Creation

If you need to create a folder for a single post manually:

```bash
mkdir "assets/images/posts/Your-Post-Slug"
```

The post slug follows the pattern of removing the date prefix and `.md` extension from your post filename.
