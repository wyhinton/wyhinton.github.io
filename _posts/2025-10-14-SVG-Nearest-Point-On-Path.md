---
layout: post
title: "SVG Nearest Point On Path: Linear Search vs QuadTree Optimization"
date: 2025-10-14
categories: [web-development, svg, optimization, data-structures]
tags: [typescript]
---

While working on our web mapping tool we ran into an interesting problem in regards to optimizing SVG. As part of the SVG based renderer for our map drawing tool, there was a need to have a tool whereby geo features could be snapped to the perimeter of polygon geometry. This necessitated finding the point on a set of different polygon shapes which was closest to the users cursor. There wasn't too much literature available on this at the time. 

In this post, we'll explore two fundamentally different approaches to this problem:

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
<svg width="100%" height="400" id="linear-svg"></svg>
<div class="controls">
<label>Sample Rate: <input type="range" id="sample-rate" min="50" max="100" value="50" step="10"></label>
<span id="sample-count">100 samples</span>
</div>
<div class="performance-metrics"><div class="metric">
<strong class="metric-label">Query Time:</strong> <span id="linear-time">--</span>
</div>
<div class="metric">
<strong class="metric-label">Samples Checked:</strong> <span id="linear-samples">--</span>
</div>
<div class="metric">
<strong class="metric-label">Average FPS:</strong> <span id="linear-fps">--</span>
</div>
</div>
</div>
<div class="performance-chart">
<canvas width="580" height="100" id="linear-performance-chart"></canvas>
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
<svg width="600" height="400" id="quadtree-svg">
<!-- Multiple paths and quadtree visualization -->
</svg>
<div class="controls">
<label><input type="checkbox" id="show-quadtree" checked> Show QuadTree</label>
<label>Max Depth: <input type="range" id="max-depth" min="3" max="8" value="5"></label>
<label>Points per Node: <input type="range" id="max-points" min="5" max="50" value="20"></label>
</div>
<div class="performance-metrics"><div class="metric">
<strong class="metric-label">Query Time:</strong> <span id="quadtree-time">--</span>
</div>
<div class="metric">
<strong class="metric-label">Candidates Checked:</strong> <span id="quadtree-candidates">--</span>
</div>
<div class="metric">
<strong class="metric-label">Search Radius:</strong> <span id="quadtree-radius">--</span>
</div>
<div class="metric">
<strong class="metric-label">Average FPS:</strong> <span id="quadtree-fps">--</span>
</div>
</div>
<div class="performance-chart">
<canvas width="580" height="100" id="quadtree-performance-chart"></canvas>
</div>
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

### Pros and Cons

**Advantages:**
- O(log n) average query time
- Excellent for multiple paths
- Scales well with complex scenes
- Can handle real-time applications

**Disadvantages:**
- Higher memory usage
- Preprocessing overhead
- More complex implementation
- Fixed accuracy based on initial sampling

## Performance Comparison

<div id="performance-comparison" class="demo-container">
<h3>Performance Comparison</h3>
<canvas width="600" height="300" id="performance-chart"></canvas>
<div class="controls">
<button id="run-benchmark">Run Benchmark</button>
<label>Number of Paths: <input type="range" id="path-count" min="1" max="50" value="10"></label>
<label>Queries per Test: <input type="range" id="query-count" min="100" max="1000" value="500" step="100"></label>
</div>
<div id="benchmark-results"></div>
</div>

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

## Interactive Playground

<div id="playground" class="demo-container">
<h3>Try Both Approaches</h3>
<svg width="800" height="500" id="playground-svg">
<!-- Interactive drawing area -->
</svg>
<div class="controls">
<button id="draw-path">Draw New Path</button>
<button id="clear-paths">Clear All</button>
<label>
Algorithm: 
<select id="algorithm-select">
<option value="linear">Linear Search</option>
<option value="quadtree">QuadTree</option>
<option value="both">Both (Compare)</option>
</select>
</label>
</div>
<div id="playground-stats"></div>
</div>

## Conclusion

Both approaches have their place in modern web development. The linear search is perfect for simple cases and prototyping, while QuadTree optimization becomes essential when performance matters.

For production applications dealing with complex SVG interactions, consider:

1. Start with linear search for MVP
2. Profile your specific use case
3. Implement QuadTree if performance bottlenecks appear
4. Consider hybrid approaches for dynamic content

The key is measuring real-world performance with your actual data and use patterns rather than optimizing prematurely.

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
  margin-top: 1rem;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.performance-chart canvas {
  width: 100%;
  height: 100px;
  border: none;
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

<script>
// Interactive demos will be implemented here
// This would include all the JavaScript for the interactive examples
document.addEventListener('DOMContentLoaded', function() {
  initializeLinearDemo();
  initializeQuadTreeDemo();
  initializePerformanceComparison();
  initializePlayground();
});

function initializeLinearDemo() {
  // Implementation for linear search demo
}

function initializeQuadTreeDemo() {
  // Implementation for quadtree demo
}

function initializePerformanceComparison() {
  // Implementation for performance benchmarking
}

function initializePlayground() {
  // Implementation for interactive playground
}
</script>

<script src="{{ '/assets/js/svg-nearest-point-demos.js' | relative_url }}"></script>
