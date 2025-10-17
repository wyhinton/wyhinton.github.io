// QuadTree Search Demo for SVG Nearest Point
import { Pane } from 'tweakpane';
import { QuadTreeNode, loadSVGPaths, randomlyPlacePaths } from './shared-types.js';
export class QuadTreePathSearch {
    constructor(pathElements, sampleRate = 100, maxPoints = 20, maxDepth = 5) {
        this.paths = pathElements;
        this.sampleRate = sampleRate;
        this.maxPoints = maxPoints;
        this.maxDepth = maxDepth;
        this.quadTree = null;
        this.buildTime = 0;
        this.buildQuadTree();
    }
    buildQuadTree() {
        const startTime = performance.now();
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
        const endTime = performance.now();
        this.buildTime = endTime - startTime;
    }
    findNearestPoint(mouseX, mouseY, searchRadius = 50) {
        const startTime = performance.now();
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
    getBuildTime() {
        return this.buildTime;
    }
}
// Store Tweakpane instances
const paneInstances = new Map();
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
export async function initializeQuadTreeDemo() {
    const svg = document.getElementById('quadtree-svg');
    if (!svg)
        return;
    try {
        // Dynamically load and parse the TEST_SHAPES.svg file
        const pathData = await loadSVGPaths('/assets/images/web-demo-images/TEST_SHAPES.svg');
        if (pathData.length === 0) {
            console.warn('No paths found in TEST_SHAPES.svg, falling back to default paths');
        }
        const paths = [];
        pathData.forEach((d, index) => {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke', index === 0 ? '#4a90e2' : '#e74c3c');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('fill', 'none');
            path.setAttribute('class', `demo-path quadtree-demo-path-${index}`);
            svg.appendChild(path);
            paths.push(path);
        });
        // Randomly place the paths by default
        const transformedPaths = randomlyPlacePaths(svg, paths, 20);
        // Continue with the rest of the initialization
        initializeQuadTreeDemoWithPaths(svg, transformedPaths);
    }
    catch (error) {
        console.error('Failed to load SVG paths:', error);
    }
}
function initializeQuadTreeDemoWithPaths(svg, paths) {
    // Initial setup
    const initialNumShapes = Math.min(paths.length, 2);
    let currentMaxDepth = 5;
    let currentMaxPoints = 20;
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
    // Create connection line from cursor to nearest point
    const connectionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    connectionLine.setAttribute('stroke', '#ff6b6b');
    connectionLine.setAttribute('stroke-width', '2');
    connectionLine.setAttribute('stroke-dasharray', '5,5');
    connectionLine.setAttribute('class', 'connection-line quadtree-demo-connection-line');
    connectionLine.style.display = 'none';
    svg.appendChild(connectionLine);
    let quadTreeSearch = new QuadTreePathSearch(paths.slice(0, initialNumShapes), 100, currentMaxPoints, currentMaxDepth);
    // Performance tracking
    const performanceTimes = [];
    const maxDataPoints = 100;
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    // Initialize Tweakpane with controls and monitoring
    const container = document.getElementById('quadtree-performance-chart');
    if (container) {
        const pane = new Pane({
            container,
            title: 'QuadTree Controls',
            expanded: true,
        });
        // Parameters object for Tweakpane
        const params = {
            showQuadTree: true,
            maxDepth: currentMaxDepth,
            maxPoints: currentMaxPoints,
            numShapes: initialNumShapes,
            queryTime: 0,
            buildTime: quadTreeSearch.getBuildTime(),
            fps: 60,
            candidatesChecked: 0,
            searchRadius: 50
        };
        // Add number of shapes control
        pane.addBinding(params, 'numShapes', {
            label: '# Shapes',
            min: 1,
            max: paths.length,
            step: 1
        }).on('change', (ev) => {
            const previousNumShapes = params.numShapes;
            params.numShapes = ev.value;
            // If we're increasing the number of shapes, re-randomize all paths
            if (params.numShapes > previousNumShapes) {
                const newTransformedPaths = randomlyPlacePaths(svg, paths, 20);
            }
            // Update visibility of paths
            paths.forEach((path, index) => {
                if (index < params.numShapes) {
                    path.style.display = 'block';
                }
                else {
                    path.style.display = 'none';
                }
            });
            // Recreate quadtree with the selected number of paths
            quadTreeSearch = new QuadTreePathSearch(paths.slice(0, params.numShapes), 100, params.maxPoints, params.maxDepth);
            params.buildTime = quadTreeSearch.getBuildTime();
            if (params.showQuadTree) {
                updateQuadTreeVisualization();
            }
        });
        // Add controls
        pane.addBinding(params, 'showQuadTree', {
            label: 'Show QuadTree'
        }).on('change', (ev) => {
            if (ev.value) {
                updateQuadTreeVisualization();
            }
            else {
                quadTreeGroup.innerHTML = '';
            }
        });
        pane.addBinding(params, 'maxDepth', {
            label: 'Max Depth',
            min: 3,
            max: 8,
            step: 1
        }).on('change', (ev) => {
            params.maxDepth = ev.value;
            quadTreeSearch = new QuadTreePathSearch(paths.slice(0, params.numShapes), 100, params.maxPoints, params.maxDepth);
            params.buildTime = quadTreeSearch.getBuildTime();
            if (params.showQuadTree) {
                updateQuadTreeVisualization();
            }
        });
        pane.addBinding(params, 'maxPoints', {
            label: 'Points per Node',
            min: 5,
            max: 50,
            step: 1
        }).on('change', (ev) => {
            params.maxPoints = ev.value;
            quadTreeSearch = new QuadTreePathSearch(paths.slice(0, params.numShapes), 100, params.maxPoints, params.maxDepth);
            params.buildTime = quadTreeSearch.getBuildTime();
            if (params.showQuadTree) {
                updateQuadTreeVisualization();
            }
        });
        // Add monitors for performance metrics
        pane.addBinding(params, 'queryTime', {
            label: 'Query Time',
            format: (v) => `${v.toFixed(3)}ms`,
            interval: 100,
            readonly: true
        });
        pane.addBinding(params, 'buildTime', {
            label: 'Build Time',
            format: (v) => `${v.toFixed(3)}ms`,
            readonly: true
        });
        pane.addBinding(params, 'fps', {
            label: 'FPS',
            format: (v) => Math.round(v).toString(),
            readonly: true
        });
        pane.addBinding(params, 'candidatesChecked', {
            label: 'Candidates',
            readonly: true
        });
        pane.addBinding(params, 'searchRadius', {
            label: 'Search Radius',
            readonly: true
        });
        // Add randomize locations button
        pane.addButton({
            title: 'Randomize Locations'
        }).on('click', () => {
            const newTransformedPaths = randomlyPlacePaths(svg, paths, 20);
            quadTreeSearch = new QuadTreePathSearch(newTransformedPaths.slice(0, params.numShapes), 100, params.maxPoints, params.maxDepth);
            params.buildTime = quadTreeSearch.getBuildTime();
            if (params.showQuadTree) {
                updateQuadTreeVisualization();
            }
        });
        // Store for later updates
        paneInstances.set('quadtree-performance-chart', { pane, params });
        // Update function that uses params
        function updateQuadTreeVisualization() {
            if (!params.showQuadTree) {
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
        // Initial visualization
        updateQuadTreeVisualization();
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
            // Update connection line from cursor to nearest point
            connectionLine.setAttribute('x1', mouseX.toString());
            connectionLine.setAttribute('y1', mouseY.toString());
            connectionLine.setAttribute('x2', result.point.x.toString());
            connectionLine.setAttribute('y2', result.point.y.toString());
            connectionLine.style.display = 'block';
        }
        // Show search radius
        searchRadiusCircle.setAttribute('cx', mouseX.toString());
        searchRadiusCircle.setAttribute('cy', mouseY.toString());
        searchRadiusCircle.setAttribute('r', result.searchRadius.toString());
        searchRadiusCircle.style.display = 'block';
        // Update performance metrics
        updateQuadTreePerformanceMetrics(result, mouseX, mouseY);
        // Update Tweakpane parameters
        const paneData = paneInstances.get('quadtree-performance-chart');
        if (paneData) {
            paneData.params.queryTime = result.time;
            paneData.params.candidatesChecked = result.candidatesChecked;
            paneData.params.searchRadius = result.searchRadius;
        }
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
            if (paneData) {
                paneData.params.fps = fps;
            }
            frameCount = 0;
            lastFpsUpdate = now;
        }
    });
    svg.addEventListener('mouseleave', function () {
        nearestPoint.style.display = 'none';
        connectionLine.style.display = 'none';
        searchRadiusCircle.style.display = 'none';
    });
    // Set initial visibility based on initialNumShapes
    paths.forEach((path, index) => {
        if (index < initialNumShapes) {
            path.style.display = 'block';
        }
        else {
            path.style.display = 'none';
        }
    });
}
//# sourceMappingURL=quadtree-nearest-point-demo.js.map