"use strict";
// SVG Nearest Point Interactive Demos - TypeScript Version
// Companion TypeScript for the blog post
class LinearPathSearch {
    constructor(pathElement, sampleRate = 100, pathIndex = 0) {
        this.path = pathElement;
        this.sampleRate = sampleRate;
        this.pathLength = this.path.getTotalLength();
        this.sampleStep = this.pathLength / this.sampleRate;
        this.pathIndex = pathIndex;
    }
    findNearestPoint(mouseX, mouseY) {
        const startTime = performance.now();
        let nearestPoint = null;
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
            point: refinedPoint || nearestPoint,
            distance: minDistance,
            time: endTime - startTime,
            samplesChecked: this.sampleRate + 1,
            pathIndex: this.pathIndex
        };
    }
    refinePoint(approximateT, mouseX, mouseY, iterations = 5) {
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
            }
            else {
                left = t1;
            }
        }
        const finalT = (left + right) / 2;
        return this.path.getPointAtLength(finalT);
    }
}
class QuadTreeNode {
    constructor(bounds, maxPoints = 20, maxDepth = 5, depth = 0) {
        this.bounds = bounds;
        this.maxPoints = maxPoints;
        this.maxDepth = maxDepth;
        this.depth = depth;
        this.points = [];
        this.children = null;
        this.divided = false;
    }
    insert(point) {
        if (!this.contains(point))
            return false;
        if (this.points.length < this.maxPoints || this.depth >= this.maxDepth) {
            this.points.push(point);
            return true;
        }
        if (!this.divided) {
            this.subdivide();
        }
        return !!(this.children.nw.insert(point) ||
            this.children.ne.insert(point) ||
            this.children.sw.insert(point) ||
            this.children.se.insert(point));
    }
    subdivide() {
        const { x, y, width, height } = this.bounds;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        this.children = {
            nw: new QuadTreeNode({ x, y, width: halfWidth, height: halfHeight }, this.maxPoints, this.maxDepth, this.depth + 1),
            ne: new QuadTreeNode({ x: x + halfWidth, y, width: halfWidth, height: halfHeight }, this.maxPoints, this.maxDepth, this.depth + 1),
            sw: new QuadTreeNode({ x, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.maxPoints, this.maxDepth, this.depth + 1),
            se: new QuadTreeNode({ x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.maxPoints, this.maxDepth, this.depth + 1)
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
    contains(point) {
        return (point.x >= this.bounds.x &&
            point.x < this.bounds.x + this.bounds.width &&
            point.y >= this.bounds.y &&
            point.y < this.bounds.y + this.bounds.height);
    }
    query(range, found = []) {
        if (!this.intersects(range))
            return found;
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
    intersects(range) {
        return !(range.x > this.bounds.x + this.bounds.width ||
            range.x + range.width < this.bounds.x ||
            range.y > this.bounds.y + this.bounds.height ||
            range.y + range.height < this.bounds.y);
    }
    pointInRange(point, range) {
        return (point.x >= range.x &&
            point.x <= range.x + range.width &&
            point.y >= range.y &&
            point.y <= range.y + range.height);
    }
    getAllBounds() {
        const bounds = [this.bounds];
        if (this.divided && this.children) {
            bounds.push(...this.children.nw.getAllBounds());
            bounds.push(...this.children.ne.getAllBounds());
            bounds.push(...this.children.sw.getAllBounds());
            bounds.push(...this.children.se.getAllBounds());
        }
        return bounds;
    }
}
class QuadTreePathSearch {
    constructor(pathElements, sampleRate = 100, maxPoints = 20, maxDepth = 5) {
        this.paths = pathElements;
        this.sampleRate = sampleRate;
        this.maxPoints = maxPoints;
        this.maxDepth = maxDepth;
        this.quadTree = null;
        this.buildQuadTree();
    }
    buildQuadTree() {
        // Calculate bounding box for all paths
        const bounds = this.calculateBounds();
        this.quadTree = new QuadTreeNode(bounds, this.maxPoints, this.maxDepth);
        // Sample points from all paths and insert into quadtree
        this.paths.forEach((path, pathIndex) => {
            const pathLength = path.getTotalLength();
            for (let i = 0; i <= this.sampleRate; i++) {
                const t = (i / this.sampleRate) * pathLength;
                const point = path.getPointAtLength(t);
                this.quadTree.insert({
                    x: point.x,
                    y: point.y,
                    pathIndex,
                    t,
                    path
                });
            }
        });
    }
    findNearestPoint(mouseX, mouseY, searchRadius = 50) {
        const startTime = performance.now();
        const originalRadius = searchRadius;
        // Query points within search radius
        let candidates = this.quadTree.query({
            x: mouseX - searchRadius,
            y: mouseY - searchRadius,
            width: searchRadius * 2,
            height: searchRadius * 2
        });
        if (candidates.length === 0 && searchRadius < 200) {
            // Expand search if no candidates found
            return this.findNearestPoint(mouseX, mouseY, searchRadius * 2);
        }
        // Find nearest candidate
        let nearestPoint = null;
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
            point: nearestPoint,
            distance: minDistance,
            time: endTime - startTime,
            candidatesChecked: candidates.length,
            searchRadius: searchRadius
        };
    }
    calculateBounds() {
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
            x: minX - 10,
            y: minY - 10,
            width: maxX - minX + 20,
            height: maxY - minY + 20
        };
    }
    getQuadTreeBounds() {
        return this.quadTree ? this.quadTree.getAllBounds() : [];
    }
}
// Demo initialization functions
async function initializeLinearDemo() {
    const svg = document.getElementById('linear-svg');
    if (!svg)
        return;
    try {
        // Dynamically load and parse the TEST_SHAPES.svg file
        const pathData = await loadSVGPaths('/assets/images/web-demo-images/TEST_SHAPES.svg');
        if (pathData.length === 0) {
            console.warn('No paths found in TEST_SHAPES.svg, falling back to default paths');
            // Fallback to hardcoded paths if loading fails
            pathData.push('M278,54l39.5,23-192.5,137.5,60.5,76L457.5,49l29.5,25-219.5,229,34.5,157.5-74.5-130.5-153,126.5,66.5-147.5-124,75,74.5-123.5-82.5-4,80.5-62.5-39-92.5,139,54.5,89-102.5Z', 'M87.5,48.5l117.5-23.5,249,251.5-101,125.5L17,211,87.5,48.5Z');
        }
        const paths = [];
        pathData.forEach((d, index) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke', index === 0 ? '#4a90e2' : '#e74c3c');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('fill', 'none');
            path.setAttribute('class', `demo-path demo-path-${index}`);
            svg.appendChild(path);
            paths.push(path);
        });
        // Continue with the rest of the initialization
        initializeLinearDemoWithPaths(svg, paths);
    }
    catch (error) {
        console.error('Failed to load SVG paths:', error);
        // Fallback to hardcoded paths
        initializeLinearDemoFallback(svg);
    }
}
async function loadSVGPaths(svgUrl) {
    try {
        const response = await fetch(svgUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.status}`);
        }
        const svgText = await response.text();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        // Check for parsing errors
        const parseError = svgDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Failed to parse SVG');
        }
        // Extract all path elements and their 'd' attributes
        const pathElements = svgDoc.querySelectorAll('path');
        const pathData = [];
        pathElements.forEach(path => {
            const d = path.getAttribute('d');
            if (d) {
                // Scale the paths to fit the demo area (original viewBox is 0 0 100 100)
                // const scaledPath = scaleSVGPath(d, 1, 0, 0); // Scale by 5x, offset by (50, 50)
                const scaledPath = d;
                pathData.push(scaledPath);
            }
        });
        return pathData;
    }
    catch (error) {
        console.error('Error loading SVG paths:', error);
        return [];
    }
}
function scaleSVGPath(pathData, scale, offsetX = 0, offsetY = 0) {
    // Simple path scaling - this handles basic M, L, and relative commands
    // For production use, consider using a more robust SVG path parsing library
    return pathData.replace(/([ML])\s*([0-9.-]+),\s*([0-9.-]+)/g, (match, command, x, y) => {
        const scaledX = parseFloat(x) * scale + offsetX;
        const scaledY = parseFloat(y) * scale + offsetY;
        return `${command}${scaledX},${scaledY}`;
    }).replace(/([lhv])\s*([0-9.-]+)/g, (match, command, value) => {
        const scaledValue = parseFloat(value) * scale;
        return `${command}${scaledValue}`;
    });
}
function initializeLinearDemoFallback(svg) {
    // Fallback with hardcoded paths
    const pathData = [
        'M278,54l39.5,23-192.5,137.5,60.5,76L457.5,49l29.5,25-219.5,229,34.5,157.5-74.5-130.5-153,126.5,66.5-147.5-124,75,74.5-123.5-82.5-4,80.5-62.5-39-92.5,139,54.5,89-102.5Z',
        'M87.5,48.5l117.5-23.5,249,251.5-101,125.5L17,211,87.5,48.5Z'
    ];
    const paths = [];
    pathData.forEach((d, index) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('stroke', index === 0 ? '#4a90e2' : '#e74c3c');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('class', `demo-path demo-path-fallback-${index}`);
        svg.appendChild(path);
        paths.push(path);
    });
    initializeLinearDemoWithPaths(svg, paths);
}
function initializeLinearDemoWithPaths(svg, paths) {
    // Create multiple linear search instances for all paths
    const linearSearchers = paths.map((path, index) => new LinearPathSearch(path, 100, index));
    // Create nearest point indicator
    const nearestPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    nearestPoint.setAttribute('r', '6');
    nearestPoint.setAttribute('class', 'nearest-point linear-demo-nearest-point');
    nearestPoint.style.display = 'none';
    svg.appendChild(nearestPoint);
    // Create line from cursor to nearest point
    const connectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    connectionLine.setAttribute('stroke', '#ff6b6b');
    connectionLine.setAttribute('stroke-width', '2');
    connectionLine.setAttribute('stroke-dasharray', '5,5');
    connectionLine.setAttribute('class', 'connection-line linear-demo-connection-line');
    connectionLine.style.display = 'none';
    svg.appendChild(connectionLine);
    // Create highlight overlays for each path (initially hidden)
    const pathHighlights = paths.map((path, index) => {
        const highlightPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        highlightPath.setAttribute('d', path.getAttribute('d') || '');
        highlightPath.setAttribute('fill', index === 0 ? '#4a90e280' : '#e74c3c80'); // Semi-transparent fill
        highlightPath.setAttribute('stroke', 'none');
        highlightPath.setAttribute('class', `path-highlight linear-demo-highlight-${index}`);
        highlightPath.style.display = 'none';
        highlightPath.style.pointerEvents = 'none'; // Don't interfere with mouse events
        svg.appendChild(highlightPath);
        return highlightPath;
    });
    // Create sample points visualization for all paths
    const sampleGroups = paths.map((path, index) => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', `sample-points-${index}`);
        group.setAttribute('class', `sample-points-group linear-demo-samples-${index}`);
        svg.appendChild(group);
        return group;
    });
    // Performance tracking
    const performanceTimes = [];
    const maxDataPoints = 100;
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    // Update sample rate
    const sampleRateSlider = document.getElementById('sample-rate');
    const sampleCountSpan = document.getElementById('sample-count');
    if (sampleRateSlider && sampleCountSpan) {
        sampleRateSlider.addEventListener('input', function () {
            const sampleRate = parseInt(this.value);
            sampleCountSpan.textContent = `${sampleRate} samples`;
            // Update all linear searchers
            linearSearchers.forEach((searcher, index) => {
                linearSearchers[index] = new LinearPathSearch(paths[index], sampleRate, index);
                updateSampleVisualization(paths[index], sampleRate, sampleGroups[index]);
            });
        });
    }
    // Mouse tracking with performance monitoring
    svg.addEventListener('mousemove', function (e) {
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        // Search all paths to find the globally nearest point
        let bestResult = null;
        let minDistance = Infinity;
        let totalSamplesChecked = 0;
        const startTime = performance.now();
        linearSearchers.forEach(searcher => {
            const result = searcher.findNearestPoint(mouseX, mouseY);
            totalSamplesChecked += result.samplesChecked || 0;
            if (result.distance < minDistance) {
                minDistance = result.distance;
                bestResult = result;
            }
        });
        const endTime = performance.now();
        if (bestResult) {
            // Update nearest point marker
            nearestPoint.setAttribute('cx', bestResult.point.x.toString());
            nearestPoint.setAttribute('cy', bestResult.point.y.toString());
            nearestPoint.style.display = 'block';
            // Update connection line from cursor to nearest point
            connectionLine.setAttribute('x1', mouseX.toString());
            connectionLine.setAttribute('y1', mouseY.toString());
            connectionLine.setAttribute('x2', bestResult.point.x.toString());
            connectionLine.setAttribute('y2', bestResult.point.y.toString());
            connectionLine.style.display = 'block';
            // Hide all path highlights first
            pathHighlights.forEach(highlight => {
                highlight.style.display = 'none';
            });
            // Show highlight for the nearest path
            if (bestResult.pathIndex !== undefined && pathHighlights[bestResult.pathIndex]) {
                pathHighlights[bestResult.pathIndex].style.display = 'block';
            }
            // Create combined result for metrics
            const combinedResult = {
                point: bestResult.point,
                distance: bestResult.distance,
                time: endTime - startTime,
                samplesChecked: totalSamplesChecked,
                pathIndex: bestResult.pathIndex
            };
            // Update performance metrics
            updateLinearPerformanceMetrics(combinedResult);
            // Track performance over time
            performanceTimes.push(combinedResult.time);
            if (performanceTimes.length > maxDataPoints) {
                performanceTimes.shift();
            }
        }
        // Update FPS
        frameCount++;
        const now = performance.now();
        if (now - lastFpsUpdate > 1000) {
            const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
            const fpsElement = document.getElementById('linear-fps');
            if (fpsElement) {
                fpsElement.textContent = fps.toString();
            }
            frameCount = 0;
            lastFpsUpdate = now;
        }
        // Update performance chart
        updatePerformanceChart('linear-performance-chart', performanceTimes, '#ff6b6b');
    });
    svg.addEventListener('mouseleave', function () {
        nearestPoint.style.display = 'none';
        connectionLine.style.display = 'none';
        // Hide all path highlights
        pathHighlights.forEach(highlight => {
            highlight.style.display = 'none';
        });
    });
    // Initial sample visualization for all paths
    paths.forEach((path, index) => {
        updateSampleVisualization(path, 100, sampleGroups[index]);
    });
}
function updateLinearPerformanceMetrics(result) {
    const timeSpan = document.getElementById('linear-time');
    const samplesSpan = document.getElementById('linear-samples');
    if (timeSpan) {
        timeSpan.textContent = result.time.toFixed(3);
    }
    if (samplesSpan) {
        samplesSpan.textContent = result.samplesChecked?.toString() || '--';
    }
}
function initializeQuadTreeDemo() {
    const svg = document.getElementById('quadtree-svg');
    if (!svg)
        return;
    // Create multiple paths
    const paths = [];
    const pathData = [
        'M50,100 Q150,50 250,100 T450,80',
        'M80,200 Q180,150 280,200 T480,180',
        'M60,300 Q160,250 260,300 T460,280',
        'M100,350 C200,300 300,400 400,350'
    ];
    pathData.forEach((d, i) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('stroke', `hsl(${i * 60}, 70%, 50%)`);
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('class', `demo-path quadtree-demo-path-${i}`);
        svg.appendChild(path);
        paths.push(path);
    });
    // Create quadtree boundaries container
    const quadTreeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    quadTreeGroup.setAttribute('id', 'quadtree-boundaries');
    quadTreeGroup.setAttribute('class', 'quadtree-boundaries-container');
    svg.appendChild(quadTreeGroup);
    // Create search radius visualization
    const searchRadiusCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    searchRadiusCircle.setAttribute('r', '50');
    searchRadiusCircle.setAttribute('fill', 'rgba(255, 107, 107, 0.1)');
    searchRadiusCircle.setAttribute('stroke', 'rgba(255, 107, 107, 0.3)');
    searchRadiusCircle.setAttribute('stroke-width', '2');
    searchRadiusCircle.setAttribute('class', 'search-radius-circle quadtree-search-radius');
    searchRadiusCircle.style.display = 'none';
    svg.appendChild(searchRadiusCircle);
    // Create nearest point indicator
    const nearestPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    nearestPoint.setAttribute('r', '6');
    nearestPoint.setAttribute('class', 'nearest-point quadtree-demo-nearest-point');
    nearestPoint.style.display = 'none';
    svg.appendChild(nearestPoint);
    let quadTreeSearch = new QuadTreePathSearch(paths, 100, 20, 5);
    // Performance tracking
    const performanceTimes = [];
    const maxDataPoints = 100;
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    // Controls
    const showQuadTreeCheckbox = document.getElementById('show-quadtree');
    const maxDepthSlider = document.getElementById('max-depth');
    const maxPointsSlider = document.getElementById('max-points');
    function updateQuadTree() {
        const maxDepth = parseInt(maxDepthSlider?.value || '5');
        const maxPoints = parseInt(maxPointsSlider?.value || '20');
        quadTreeSearch = new QuadTreePathSearch(paths, 100, maxPoints, maxDepth);
        updateQuadTreeVisualization();
    }
    function updateQuadTreeVisualization() {
        if (!showQuadTreeCheckbox?.checked) {
            quadTreeGroup.innerHTML = '';
            return;
        }
        quadTreeGroup.innerHTML = '';
        const bounds = quadTreeSearch.getQuadTreeBounds();
        bounds.forEach(bound => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', bound.x.toString());
            rect.setAttribute('y', bound.y.toString());
            rect.setAttribute('width', bound.width.toString());
            rect.setAttribute('height', bound.height.toString());
            rect.setAttribute('class', 'quadtree-boundary quadtree-rect');
            quadTreeGroup.appendChild(rect);
        });
    }
    if (showQuadTreeCheckbox) {
        showQuadTreeCheckbox.addEventListener('change', updateQuadTreeVisualization);
    }
    if (maxDepthSlider) {
        maxDepthSlider.addEventListener('input', updateQuadTree);
    }
    if (maxPointsSlider) {
        maxPointsSlider.addEventListener('input', updateQuadTree);
    }
    // Mouse tracking with enhanced performance monitoring
    svg.addEventListener('mousemove', function (e) {
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const result = quadTreeSearch.findNearestPoint(mouseX, mouseY);
        if (result.point) {
            nearestPoint.setAttribute('cx', result.point.x.toString());
            nearestPoint.setAttribute('cy', result.point.y.toString());
            nearestPoint.style.display = 'block';
        }
        // Show search radius
        searchRadiusCircle.setAttribute('cx', mouseX.toString());
        searchRadiusCircle.setAttribute('cy', mouseY.toString());
        searchRadiusCircle.style.display = 'block';
        // Update performance metrics
        updateQuadTreePerformanceMetrics(result, mouseX, mouseY);
        // Track performance over time
        performanceTimes.push(result.time);
        if (performanceTimes.length > maxDataPoints) {
            performanceTimes.shift();
        }
        // Update FPS
        frameCount++;
        const now = performance.now();
        if (now - lastFpsUpdate > 1000) {
            const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
            const fpsElement = document.getElementById('quadtree-fps');
            if (fpsElement) {
                fpsElement.textContent = fps.toString();
            }
            frameCount = 0;
            lastFpsUpdate = now;
        }
        // Update performance chart
        updatePerformanceChart('quadtree-performance-chart', performanceTimes, '#4a90e2');
    });
    svg.addEventListener('mouseleave', function () {
        nearestPoint.style.display = 'none';
        searchRadiusCircle.style.display = 'none';
    });
    // Initial visualization
    updateQuadTreeVisualization();
}
function updateQuadTreePerformanceMetrics(result, mouseX, mouseY) {
    const timeSpan = document.getElementById('quadtree-time');
    const candidatesSpan = document.getElementById('quadtree-candidates');
    const radiusSpan = document.getElementById('quadtree-radius');
    if (timeSpan) {
        timeSpan.textContent = result.time.toFixed(3);
    }
    if (candidatesSpan) {
        candidatesSpan.textContent = result.candidatesChecked.toString();
    }
    if (radiusSpan) {
        radiusSpan.textContent = result.searchRadius.toString();
    }
}
function updatePerformanceChart(canvasId, data, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || data.length < 2)
        return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    // Calculate scales
    const maxTime = Math.max(...data) * 1.1;
    const minTime = 0;
    const xStep = width / (data.length - 1);
    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
        const y = (i / 5) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    // Draw performance line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((time, index) => {
        const x = index * xStep;
        const y = height - ((time - minTime) / (maxTime - minTime)) * height;
        if (index === 0) {
            ctx.moveTo(x, y);
        }
        else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    // Draw current performance indicator
    if (data.length > 0) {
        const lastTime = data[data.length - 1];
        const lastX = (data.length - 1) * xStep;
        const lastY = height - ((lastTime - minTime) / (maxTime - minTime)) * height;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${maxTime.toFixed(2)}ms`, 5, 12);
    ctx.fillText('0ms', 5, height - 2);
    ctx.textAlign = 'right';
    ctx.fillText('Time →', width - 5, height - 2);
}
function updateSampleVisualization(path, sampleRate, container) {
    // Clear existing points
    container.innerHTML = '';
    const pathLength = path.getTotalLength();
    for (let i = 0; i <= sampleRate; i++) {
        const t = (i / sampleRate) * pathLength;
        const point = path.getPointAtLength(t);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x.toString());
        circle.setAttribute('cy', point.y.toString());
        circle.setAttribute('r', '1.5');
        circle.setAttribute('fill', 'rgba(74, 144, 226, 0.6)');
        circle.setAttribute('class', 'sample-point path-sample-point');
        container.appendChild(circle);
    }
}
// Placeholder functions for other demos (implement as needed)
function initializePerformanceComparison() {
    // Implementation would go here
    console.log('Performance comparison demo not yet implemented');
}
function initializePlayground() {
    // Implementation would go here
    console.log('Playground demo not yet implemented');
}
// Initialize all demos when the page loads
document.addEventListener('DOMContentLoaded', function () {
    initializeLinearDemo();
    initializeQuadTreeDemo();
    initializePerformanceComparison();
    initializePlayground();
});
//# sourceMappingURL=svg-nearest-point-demos.js.map