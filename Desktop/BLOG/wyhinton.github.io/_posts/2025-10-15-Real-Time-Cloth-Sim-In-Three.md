---
layout: post
title: "Real-Time Cloth Simulation in Three.js"
date: 2025-10-15
categories: [graphics, simulation, three.js]
tags: [cloth, physics, real-time, webgl, hidden]
---

# Real-Time Cloth Simulation with Cubic Barrier Forces

This demo implements a real-time cloth simulation using mass-spring dynamics with cubic barrier forces for collision handling. The cloth is modeled as a grid of particles connected by springs, with contact forces that prevent penetration through obstacles.

## Key Features
 
- **Mass-Spring System**: Cloth modeled as particles connected by structural, shear, and bend springs
- **Cubic Barrier Forces**: Smooth contact forces that prevent cloth from penetrating obstacles
- **Interactive Controls**: Drag cloth vertices with mouse, toggle gravity and wireframe modes
- **Real-time Performance**: Optimized physics simulation running at 60 FPS

## Physics Implementation

The simulation uses:
- **Verlet Integration**: For stable particle motion
- **Spring Forces**: Hooke's law for cloth elasticity
- **Barrier Method**: Cubic penalty forces for contacts
- **Damping**: To prevent excessive oscillation

<div id="cloth-demo-container"></div>

<script type="module" src="{{ '/assets/js/three-cloth/three-cloth-demo.js' | relative_url }}"></script>
