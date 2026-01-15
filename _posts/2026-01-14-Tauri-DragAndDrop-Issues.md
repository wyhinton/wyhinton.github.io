---
layout: post
title: "Tauri DragAndDrop Issues and Solutions"
date: 2026-01-14
categories: [tauri, rust, desktop]
tags: [drag-drop, file-handling, desktop-app, troubleshooting]
---

You may run into this very frustrating problem in your tauri windows app if you are both trying to use the OS level drag and drop API as well as the HTML5 drag and drop API. Tldr, as of writing it's impossible to use both of API's simultaneously, and there's not a clean way to work around that, see this [issue](https://github.com/tauri-apps/tauri/issues/14373). You can choose which one you want to use (on a per window basis) via the `dragDropEnabled` property, which is set to true by default: 

```json
//from tauri docs
     "dragDropEnabled": {
          "description": "Whether the drag and drop is enabled or not on the webview. By default it is enabled.\n\n Disabling it is required to use HTML5 drag and drop on the frontend on Windows.",
          "default": true,
          "type": "boolean"
        },
```

If `dragDropEnabled` is true, whenever you try to drag and drop from an element in your webview you'll see the `not-allowed` cursor 🚫:
<figcaption>
{% include post_image.html name="dragdropissue.gif" alt="Demo animation" %}
</figcaption>

I tried multiple different libraries like [neodrag](https://github.com/PuruVJ/neodrag/tree/main/packages/svelte#readme), [dnd-svelte-kit](dnd-kit-svelte.vercel.app) and they also will not work if `dragDropEnabled` is true on windows.

If you want to use the OS level file drag and drop, you have to enable it in your `tauri.conf.json` file, or if you prefer you can do it with the rust window builder:

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
//tauri.conf.json
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
        "title": "debug",
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

I became a little curious as to why exactly this is a windows related issue. Basically, on Windows, `dragDropEnabled = true` installs a native Object Linking and Embedding (OLE) drag-and-drop handler that captures and consumes drag events before the WebView can see them, which disables the HTML5 drag & drop API. OLE on windows is what enables applications to exchange objects/data via drag-and-drop, clipboard, and embedding, but its a legacy system. On Mac/Linux the drag and drop is not consumed.

| Platform    | Drag handling                   |
| ----------- | ------------------------------- |
| macOS       | AppKit allows coexistence       |
| Linux       | GTK/WebKit allows bubbling      |
| **Windows** | **Exclusive OLE drop target** ❌ |

