---
layout: post
title: "Tauri DragAndDrop Issues and Solutions"
date: 2026-01-14
categories: [tauri, rust, desktop]
tags: [drag-drop, file-handling, desktop-app, troubleshooting]
---

You may run into this very frustrating problem in your tauri app if you are both trying to use the OS level drag and drop API as well as the HTML5 drag and drop API. Tldr, as of writing it's impossible to use both of these simultaneously, and there's not a clean way to work around that, see this [issue](https://github.com/tauri-apps/tauri/issues/14373).

{% include post_image.html name="dragdrop_issue_demo.gif" alt="Drag and drop conflict demonstration" caption="Example of the conflicting drag and drop behaviors" %}

I spent hours trying to debug why I was getting the "not enabled" styling when trying to drag and drop within my webview: