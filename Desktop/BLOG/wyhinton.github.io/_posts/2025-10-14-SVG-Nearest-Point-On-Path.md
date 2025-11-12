---
layout: post
title: "SVG Nearest Point On Path: Linear Search vs QuadTree Optimization"
date: 2025-10-14
categories: [web-development, svg, optimization, data-structures]
tags: [typescript]
---
<!-- filepath: c:\Users\Primary User\Desktop\BLOG\wyhinton.github.io\_posts\2025-10-14-SVG-Nearest-Point-On-Path.md -->
<!-- markdownlint-disable MD033 -->
<script type="module" src="{{ '/assets/js/svg-nearest-point/svg-nearest-point-demos.js' | relative_url }}"></script>


While working on our web mapping tool we ran into an interesting problem in regards to optimizing SVG. As part of the SVG based renderer for our map drawing tool, there was a need to have a tool whereby geo features could be snapped to the perimeter of polygon geometry. This necessitated finding the point on a set of different polygon shapes which was closest to the users cursor.

In this post, we'll explore the naive approach we initially took to this problem, its issues, and then go over a more optimized solution which uses spatial indexing.


1. **Linear Search**: Iterating over the path length and checking distances
2. **QuadTree Optimization**: Pre-computing spatial indices for fast queries

## The Problem

When a user hovers over or near an SVG path, we want to find the exact point on that path that's closest to their cursor position. This seems simple, but becomes challenging when dealing with:

- Complex curved paths (Bézier curves, arcs)
- Multiple paths that need to be queried simultaneously
- Real-time performance requirements (60fps mouse tracking)
- Paths with thousands of segments

## Approach 1: Linear Search Along Path Length

The straightforward approach samples points along the path at regular intervals and finds the one with minimum distance to the cursor.

<div id="linear-demo" class="demo-container">
  <h3>Linear Search Demo</h3>
  <div class="graphics-wrapper">
  <div class="performance-chart">
  <div id="linear-demo-graphics-wrapper"></div>
  </div>
  <svg width="100%" height="400" id="linear-svg"></svg>
  </div>
</div>

### Implementation

```typescript
interface Point {
  x: number;
  y: number;
}

interface SearchResult {
  point: Point;
  distance: number;
  time: number;
}

class LinearPathSearch {
  private path: SVGPathElement;
  private sampleRate: number;
  private pathLength: number;
  private sampleStep: number;

  constructor(pathElement: SVGPathElement, sampleRate: number = 100) {
    this.path = pathElement;
    this.sampleRate = sampleRate;
    this.pathLength = this.path.getTotalLength();
    this.sampleStep = this.pathLength / this.sampleRate;
  }

  findNearestPoint(mouseX: number, mouseY: number): SearchResult {
    const startTime = performance.now();
    
    let nearestPoint: Point | null = null;
    let minDistance = Infinity;
    let nearestT = 0;

    // Sample points along the path
    for (let i = 0; i <= this.sampleRate; i++) {
      const t = (i / this.sampleRate) * this.pathLength;
      const point = this.path.getPointAtLength(t);
      
      const dx = point.x - mouseX;
      const dy = point.y - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
        nearestT = t;
      }
    }

    // Refine with binary search around the nearest sample
    const refinedPoint = this.refinePoint(nearestT, mouseX, mouseY);
    
    const endTime = performance.now();
    return {
      point: refinedPoint || nearestPoint!,
      distance: minDistance,
      time: endTime - startTime
    };
  }

  private refinePoint(
    approximateT: number, 
    mouseX: number, 
    mouseY: number, 
    iterations: number = 5
  ): Point {
    let left = Math.max(0, approximateT - this.sampleStep);
    let right = Math.min(this.pathLength, approximateT + this.sampleStep);

    for (let i = 0; i < iterations; i++) {
      const t1 = left + (right - left) * 0.33;
      const t2 = left + (right - left) * 0.67;

      const p1 = this.path.getPointAtLength(t1);
      const p2 = this.path.getPointAtLength(t2);

      const d1 = Math.sqrt((p1.x - mouseX) ** 2 + (p1.y - mouseY) ** 2);
      const d2 = Math.sqrt((p2.x - mouseX) ** 2 + (p2.y - mouseY) ** 2);

      if (d1 < d2) {
        right = t2;
      } else {
        left = t1;
      }
    }

    const finalT = (left + right) / 2;
    return this.path.getPointAtLength(finalT);
  }
}
```
{: .font-size-12 }

### Pros and Cons


**Advantages:**
- Simple to understand and implement
- Works with any SVG path type
- Memory efficient (no preprocessing required)
- Accuracy can be tuned with sample rate


**Disadvantages:**
- O(n) time complexity per query
- Performance degrades with longer/more complex paths
- Not suitable for real-time applications with many paths

## Approach 2: QuadTree Spatial Index

The QuadTree approach pre-processes paths into a spatial data structure, enabling logarithmic-time nearest neighbor queries.

<div id="quadtree-demo" class="demo-container">
<h3>QuadTree Demo</h3>
<div class="graphics-wrapper">
<div class="performance-chart">
<div id="quadtree-performance-chart"></div>
</div>
<svg width="100%" height="400" id="quadtree-svg">
</svg>
</div>
</div>

### Implementation

```typescript
interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface QuadTreePoint extends Point {
  pathIndex: number;
  t: number;
  path: SVGPathElement;
}

interface QuadTreeSearchResult extends SearchResult {
  candidatesChecked: number;
}

interface QuadTreeChildren {
  nw: QuadTreeNode;
  ne: QuadTreeNode;
  sw: QuadTreeNode;
  se: QuadTreeNode;
}

class QuadTreeNode {
  private bounds: Bounds;
  private maxPoints: number;
  private maxDepth: number;
  private depth: number;
  private points: QuadTreePoint[];
  private children: QuadTreeChildren | null;
  private divided: boolean;

  constructor(bounds: Bounds, maxPoints: number = 20, maxDepth: number = 5, depth: number = 0) {
    this.bounds = bounds;
    this.maxPoints = maxPoints;
    this.maxDepth = maxDepth;
    this.depth = depth;
    this.points = [];
    this.children = null;
    this.divided = false;
  }

  insert(point: QuadTreePoint): boolean {
    if (!this.contains(point)) return false;

    if (this.points.length < this.maxPoints || this.depth >= this.maxDepth) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return !!(
      this.children!.nw.insert(point) ||
      this.children!.ne.insert(point) ||
      this.children!.sw.insert(point) ||
      this.children!.se.insert(point)
    );
  }

  private subdivide(): void {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.children = {
      nw: new QuadTreeNode(
        { x, y, width: halfWidth, height: halfHeight },
        this.maxPoints, this.maxDepth, this.depth + 1
      ),
      ne: new QuadTreeNode(
        { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        this.maxPoints, this.maxDepth, this.depth + 1
      ),
      sw: new QuadTreeNode(
        { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxPoints, this.maxDepth, this.depth + 1
      ),
      se: new QuadTreeNode(
        { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxPoints, this.maxDepth, this.depth + 1
      )
    };

    this.divided = true;

    // Redistribute existing points
    for (const point of this.points) {
      this.children.nw.insert(point) ||
      this.children.ne.insert(point) ||
      this.children.sw.insert(point) ||
      this.children.se.insert(point);
    }
    this.points = [];
  }

  private contains(point: Point): boolean {
    return (
      point.x >= this.bounds.x &&
      point.x < this.bounds.x + this.bounds.width &&
      point.y >= this.bounds.y &&
      point.y < this.bounds.y + this.bounds.height
    );
  }

  query(range: Bounds, found: QuadTreePoint[] = []): QuadTreePoint[] {
    if (!this.intersects(range)) return found;

    for (const point of this.points) {
      if (this.pointInRange(point, range)) {
        found.push(point);
      }
    }

    if (this.divided && this.children) {
      this.children.nw.query(range, found);
      this.children.ne.query(range, found);
      this.children.sw.query(range, found);
      this.children.se.query(range, found);
    }

    return found;
  }

  private intersects(range: Bounds): boolean {
    return !(
      range.x > this.bounds.x + this.bounds.width ||
      range.x + range.width < this.bounds.x ||
      range.y > this.bounds.y + this.bounds.height ||
      range.y + range.height < this.bounds.y
    );
  }

  private pointInRange(point: Point, range: Bounds): boolean {
    return (
      point.x >= range.x &&
      point.x <= range.x + range.width &&
      point.y >= range.y &&
      point.y <= range.y + range.height
    );
  }
}

class QuadTreePathSearch {
  private paths: SVGPathElement[];
  private sampleRate: number;
  private quadTree: QuadTreeNode | null;

  constructor(pathElements: SVGPathElement[], sampleRate: number = 100) {
    this.paths = pathElements;
    this.sampleRate = sampleRate;
    this.quadTree = null;
    this.buildQuadTree();
  }

  private buildQuadTree(): void {
    // Calculate bounding box for all paths
    const bounds = this.calculateBounds();
    this.quadTree = new QuadTreeNode(bounds);

    // Sample points from all paths and insert into quadtree
    this.paths.forEach((path, pathIndex) => {
      const pathLength = path.getTotalLength();

      for (let i = 0; i <= this.sampleRate; i++) {
        const t = (i / this.sampleRate) * pathLength;
        const point = path.getPointAtLength(t);
        
        this.quadTree!.insert({
          x: point.x,
          y: point.y,
          pathIndex,
          t,
          path
        });
      }
    });
  }

  findNearestPoint(mouseX: number, mouseY: number, searchRadius: number = 50): QuadTreeSearchResult {
    const startTime = performance.now();

    // Query points within search radius
    const candidates = this.quadTree!.query({
      x: mouseX - searchRadius,
      y: mouseY - searchRadius,
      width: searchRadius * 2,
      height: searchRadius * 2
    });

    if (candidates.length === 0) {
      // Expand search if no candidates found
      return this.findNearestPoint(mouseX, mouseY, searchRadius * 2);
    }

    // Find nearest candidate
    let nearestPoint: QuadTreePoint | null = null;
    let minDistance = Infinity;

    for (const candidate of candidates) {
      const dx = candidate.x - mouseX;
      const dy = candidate.y - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = candidate;
      }
    }

    const endTime = performance.now();
    return {
      point: nearestPoint!,
      distance: minDistance,
      time: endTime - startTime,
      candidatesChecked: candidates.length
    };
  }

  private calculateBounds(): Bounds {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    this.paths.forEach(path => {
      const bbox = path.getBBox();
      minX = Math.min(minX, bbox.x);
      minY = Math.min(minY, bbox.y);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}
```
{: .font-size-12 }

### Pros and Cons

**Advantages:**

- O(log n) average query
- Excellent for multiple paths
- Can handle real-time applications

**Disadvantages:**

- Higher memory usage
- Preprocessing overhead
- More complex implementation
- Fixed accuracy based on initial sampling

## When to Use Each Approach

### Use Linear Search When:
- Working with a single or few paths
- Memory is constrained
- Paths change frequently
- Simplicity is prioritized

### Use QuadTree When:
- Multiple static paths
- Real-time performance required
- Many queries expected
- Memory usage is acceptable



## Conclusion

In conclusion, if you ever need to find a position along an SVG curve nearest the users cursor for interactive graphics applications with *many, complex, and static* paths  you will probably need to implement some kind of spacial acceleration like a quadtree. 

<style>
.demo-container {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px solid #333333;
  border-radius: 8px;
  background: #0b0b0b;
}

.graphics-wrapper{
    position: relative;
    display: flex;
    gap: 5px;
}

.demo-container svg {
  border: 1px solid #ccc;
  background-color:#272822;
  cursor: crosshair;
}

.controls {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.performance-metrics {
  position: absolute;
  top: 0rem;
  left: 0rem;
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
  z-index: 10;
  max-width: 280px;
  color: white;
  width: 400px;
}

.metric {
  /* padding: 0.0rem 0.6rem; */
  text-align: center;
  border-radius: 4px;
  font-size: 0.85em;
  display: flex;
}

.metric p {
    display: flex;
    width: max-content;
}

.metric strong {
  display: block;
  color: #333;
  font-size: 0.8em;
  font-weight: 600;
  color: white;
}

.metric-label{
    margin-right: 5px;
}

.metric span {
font-size: 0.85em;
  font-weight: bold;
  color: #4a90e2;
}

.performance-chart {
  width: 300px;
  height: auto;
}


/* Tweakpane dark theme styling */
.tp-dfwv {
  background: rgba(11, 11, 11, 0.9) !important;
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid #333 !important;
}

.tp-rotv {
  background: rgba(0, 0, 0, 0.8) !important;
  color: #ffffff !important;
}

.tp-lblv_l {
  color: #ffffff !important;
}

.tp-mllv_i {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #4a90e2 !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.tp-sldv_t {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.tp-sldv_k {
  background: #4a90e2 !important;
}

.tp-ckbv_i {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.tp-ckbv_w:checked .tp-ckbv_i {
  background: #4a90e2 !important;
}

#playground-svg {
  cursor: crosshair;
}

.path-highlight {
  stroke-width: 3;
  stroke: #ff6b6b;
}

.nearest-point {
  fill: #ff6b6b;
  stroke: white;
  stroke-width: 2;
}

.quadtree-boundary {
  fill: none;
  stroke: rgba(74, 144, 226, 0.3);
  stroke-width: 1;
}

.quadtree-boundary:hover {
  fill: none;
  stroke: rgba(74, 144, 226, 0.9);
  stroke-width: 2;
}

#performance-chart {
  border: 1px solid #ccc;
  background: white;
}

.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 2rem 0;
}

.algorithm-stats {
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.algorithm-stats h4 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #4a90e2;
  padding-bottom: 0.5rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.stat-item:last-child {
  border-bottom: none;
}

pre {
  overflow-x: auto;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
}


</style>