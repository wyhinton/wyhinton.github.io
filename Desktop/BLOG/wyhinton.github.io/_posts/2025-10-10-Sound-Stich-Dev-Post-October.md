---
layout: post
title: "Sound Stitch Dev Blog Post 1"
date: 2025-10-20
categories: [graphics, simulation, three.js]
tags: [sound stich, typescript, rust]
---

This is the first in what will hopefully be a couple of blog posts on a cross platform desktop processing application I've been working on called SoundStich. I've been working on it for about 3 months on and off, but felt now might be a good time to make a post about as I feel like the overall UI layout has taken shape.

So why build a desktop application?
 The approach I'm taking with this application is uniquely informed by my frustrations with current paradigms and tooling around sample management. As part of many audio workflows (both hardware and software based), I have a need to concatenate (join) audio files. Sample "packs" often come as a set of (20-100 typically) audio files, but working with these files individually can come with some headaches and workflow inneficenies. Additionally, while modern DAWs like Ableton now offer more "baked in" procedural tools (see Ableton 12's new MIDI Transformation/Generation tool), this approach has not been applied to samples.
 

I've just finished a much more fleshed out version of the UI, and it's definitely looking a bit more professional and well organized.

![ui_snapshot](../assets/images/soundstich/oct-20-ui-snap.png)
{: .shadow .ui-snapshot}

## Slicing UI References

When designing the slicing interface for SoundStitch, I drew inspiration from several existing audio slicing tools and workflows. Here are some key reference interfaces that influenced the design:

![Simpler Slicing](../assets/images/soundstich/slicing-ui-refs/simpler-slicing.jpeg)
{: .shadow .reference-image}
*Ableton Live Simpler*
{: .reference-image-caption}
![Fruity Slicer](../assets/images/soundstich/slicing-ui-refs/fruityslicer.png)
{: .shadow .reference-image}
*FL Studio Fruity Slicer*
{: .reference-image-caption}
![MPC Slicing](../assets/images/soundstich/slicing-ui-refs/mpc-slicing.jpeg)
{: .shadow .reference-image}
*MPC Slicing Interface*
{: .reference-image-caption}
![Octatrack Slice View 1](../assets/images/soundstich/slicing-ui-refs/ot-slice.jpeg)
{: .shadow .reference-image}
*Elektron Octatrack Slice View*
{: .reference-image-caption}



<style>
    .reference-image {
        max-width: 400px;
        margin-bottom: 0px;
        
    }

    .reference-image-caption{
        margin-bottom:
    }
    .reference-image > img {
        margin-bottom: 0px;
    }
    em {
        font-size: 10px;
    }
</style>