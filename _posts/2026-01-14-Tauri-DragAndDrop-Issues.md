---
layout: post
title: "Tauri Drag and Drop Issues on Windows"
date: 2026-01-14
categories: [tauri, rust, desktop]
tags: [drag-drop, file-handling, desktop-app, troubleshooting]
---

You may run into this very frustrating problem in your Tauri Windows app if you are trying to use both the OS-level drag and drop API and the HTML5 drag and drop API. TL;DR: As of writing, it's impossible to use both APIs simultaneously, and there's no clean way to work around it. See this [issue](https://github.com/tauri-apps/tauri/issues/14373). You can choose which one you want to use (on a per-window basis) via the `dragDropEnabled` property:

```json
// from Tauri docs
"dragDropEnabled": {
    "description": "Whether drag and drop is enabled or not on the webview. By default it is enabled.\n\nDisabling it is required to use HTML5 drag and drop on the frontend on Windows.",
    "default": true,
    "type": "boolean"
},
```

Because `dragDropEnabled` is true by default, whenever you try to drag and drop an element in your webview on windows, you’ll see the not-allowed cursor 🚫. 

Dragstart event handlers will fire, but dragover, drop, and dragleave will not. Drag and drop libraries like [neodrag](https://github.com/PuruVJ/neodrag/tree/main/packages/svelte#readme) and [dnd-svelte-kit](https://dnd-kit-svelte.vercel.app) will also not work properly.

<figcaption>
{% include post_image.html name="dragdropissue.gif" alt="Demo animation" caption="getting a not-allowed when dragging an element"%}
</figcaption>

To use OS-level file drag-and-drop, you can enable it either in your tauri.conf.json file or with the Rust window builder:

ROW_START
HALF_START

```rust
let window = WebviewWindowBuilder::new(
    app,
    "app",
    WebviewUrl::App(
        format!("app.html?dir={dir_path}", dir_path = dir_path).into(),
    ),
)
.disable_drag_drop_handler()
.build()
```

HALF_END
HALF_START

```json
{
// tauri.conf.json
...
    "app": {
        "withGlobalTauri": true,
        "windows": [
            {
                "dragDropEnabled": true,
                "label": "main",
                "title": "Sound Stitch",
                "width": 1266,
                "height": 800
            },
            {
                "label": "debug",
                "title": "Debug",
                "width": 700,
                "height": 800,
                "url": "/debug"
            }
        ],
    }
...
}
```

HALF_END
ROW_END

I became a little curious as to why exactly this is a Windows-related issue. Basically, on Windows, `dragDropEnabled = true` installs a native Object Linking and Embedding (OLE) drag-and-drop handler. This handler captures and consumes drag events before the WebView can see them, effectively disabling the HTML5 drag & drop API. OLE on Windows is what enables applications to exchange objects/data via drag-and-drop, clipboard, and embedding, but it's a legacy system. On Mac/Linux, the drag and drop is not consumed, so there's not issue.

| Platform    | Drag handling                   |
| ----------- | ------------------------------- |
| macOS       | AppKit allows coexistence       |
| Linux       | GTK/WebKit allows bubbling      |
| **Windows** | **Exclusive OLE drop target** ❌ |

