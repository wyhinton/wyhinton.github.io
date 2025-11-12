// Linear Search Demo for SVG Nearest Point

import { Pane } from "tweakpane";
import {
  Point,
  SearchResult,
  loadSVGPaths,
  centerPathsInSVG,
  randomlyPlacePaths,
} from "./shared-types.js";

export class LinearPathSearch {
  private path: SVGPathElement;
  private sampleRate: number;
  private pathLength: number;
  private sampleStep: number;
  private pathIndex: number;

  constructor(
    pathElement: SVGPathElement,
    sampleRate: number = 100,
    pathIndex: number = 0
  ) {
    this.path = pathElement;
    this.sampleRate = sampleRate;
    this.pathLength = this.path.getTotalLength();
    this.sampleStep = this.pathLength / this.sampleRate;
    this.pathIndex = pathIndex;
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
      time: endTime - startTime,
      samplesChecked: this.sampleRate + 1,
      pathIndex: this.pathIndex,
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

// Store Tweakpane instances
const paneInstances: Map<string, any> = new Map();

function updateSampleVisualization(
  path: SVGPathElement,
  sampleRate: number,
  container: SVGGElement
): void {
  // Clear existing points
  container.innerHTML = "";

  const pathLength = path.getTotalLength();

  for (let i = 0; i <= sampleRate; i++) {
    const t = (i / sampleRate) * pathLength;
    const point = path.getPointAtLength(t);

    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    ) as SVGCircleElement;
    circle.setAttribute("cx", point.x.toString());
    circle.setAttribute("cy", point.y.toString());
    circle.setAttribute("r", "1.5");
    circle.setAttribute("fill", "#d9d9d9");
    circle.setAttribute("opacity", ".75");
    circle.setAttribute("class", "sample-point path-sample-point");
    container.appendChild(circle);
  }
}

function initializeLinearDemoWithPaths(
  svg: SVGElement,
  paths: SVGPathElement[]
): void {
  // Create multiple linear search instances for all paths
  let currentSampleRate = 100;
  const initialNumShapes = Math.min(paths.length, 3);
  let linearSearchers = paths
    .slice(0, initialNumShapes)
    .map((path, index) => new LinearPathSearch(path, currentSampleRate, index));

  // Create nearest point indicator
  const nearestPoint = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle"
  ) as SVGCircleElement;
  nearestPoint.setAttribute("r", "6");
  nearestPoint.setAttribute("class", "nearest-point linear-demo-nearest-point");
  nearestPoint.style.display = "none";
  svg.appendChild(nearestPoint);

  // Create line from cursor to nearest point
  const connectionLine = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "line"
  ) as SVGLineElement;
  connectionLine.setAttribute("stroke", "#ff6b6b");
  connectionLine.setAttribute("stroke-width", "2");
  connectionLine.setAttribute("stroke-dasharray", "5,5");
  connectionLine.setAttribute(
    "class",
    "connection-line linear-demo-connection-line"
  );
  connectionLine.style.display = "none";
  
  svg.appendChild(connectionLine);

  // Create highlight overlays for each path
  const pathHighlights = paths.map((path, index) => {
    const highlightPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    ) as SVGPathElement;
    highlightPath.setAttribute("d", path.getAttribute("d") || "");
    highlightPath.setAttribute("fill", index === 0 ? "#4a90e280" : "#e74c3c80");
    highlightPath.setAttribute("stroke", "none");
    highlightPath.setAttribute(
      "class",
      `path-highlight linear-demo-highlight-${index}`
    );
    highlightPath.style.display = "none";
    highlightPath.style.pointerEvents = "none";
    svg.appendChild(highlightPath);
    return highlightPath;
  });

  // Create sample points visualization for all paths
  const sampleGroups = paths.map((path, index) => {
    const group = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    ) as SVGGElement;
    group.setAttribute("id", `sample-points-${index}`);
    group.setAttribute(
      "class",
      `sample-points-group linear-demo-samples-${index}`
    );
    svg.appendChild(group);
    return group;
  });

  // Performance tracking
  const performanceTimes: number[] = [];
  const maxDataPoints = 100;
  let frameCount = 0;
  let lastFpsUpdate = performance.now();

  // Initialize Tweakpane
  const container = document.getElementById("linear-demo-graphics-wrapper");
  if (container) {
    const pane = new Pane({
      container,
      expanded: true,

      title: "Linear Search Controls",
    });

    const params = {
      sampleRate: currentSampleRate,
      queryTime: 0,
      fps: 60,
      fpsGraph: 60,
      samplesChecked: (currentSampleRate + 1) * initialNumShapes,
      numShapes: initialNumShapes,
    };

    // Add sample rate control
    pane
      .addBinding(params, "sampleRate", {
        label: "Sample Rate",
        min: 50,
        max: 200,
        step: 10,
      })
      .on("change", (ev: any) => {
        currentSampleRate = ev.value;
        linearSearchers = paths
          .slice(0, params.numShapes)
          .map(
            (path, index) =>
              new LinearPathSearch(path, currentSampleRate, index)
          );
        paths.slice(0, params.numShapes).forEach((path, index) => {
          updateSampleVisualization(
            path,
            currentSampleRate,
            sampleGroups[index]
          );
        });
        
        // Update samples checked based on new sample rate and current number of shapes
        params.samplesChecked = (currentSampleRate + 1) * params.numShapes;
      });

    // Add number of shapes control
    pane
      .addBinding(params, "numShapes", {
        label: "# Shapes",
        min: 1,
        max: paths.length,
        step: 1,
      })
      .on("change", (ev: any) => {
        const previousNumShapes = params.numShapes;
        params.numShapes = ev.value;

        // If we're increasing the number of shapes, we need to randomize the newly visible ones
        if (params.numShapes > previousNumShapes) {
          // Re-randomize all paths to ensure newly visible ones have proper positions
          const newTransformedPaths = randomlyPlacePaths(svg, paths, 20);

          // Update the path highlights to match the new positions for all paths
          pathHighlights.forEach((highlight, index) => {
            if (newTransformedPaths[index]) {
              highlight.setAttribute(
                "d",
                newTransformedPaths[index].getAttribute("d") || ""
              );
            }
          });
        }

        // Update visibility of paths and highlights
        paths.forEach((path, index) => {
          if (index < params.numShapes) {
            path.style.display = "block";
            pathHighlights[index].style.display = "none"; // Reset highlight display
          } else {
            path.style.display = "none";
            pathHighlights[index].style.display = "none";
          }
        });

        // Update sample point groups visibility
        sampleGroups.forEach((group, index) => {
          if (index < params.numShapes) {
            group.style.display = "block";
          } else {
            group.style.display = "none";
          }
        });

        // Recreate linear searchers with the selected number of paths
        linearSearchers = paths
          .slice(0, params.numShapes)
          .map(
            (path, index) =>
              new LinearPathSearch(path, currentSampleRate, index)
          );

        // Update sample visualizations for visible paths
        paths.slice(0, params.numShapes).forEach((path, index) => {
          updateSampleVisualization(
            path,
            currentSampleRate,
            sampleGroups[index]
          );
        });
        
        // Update samples checked based on current sample rate and new number of shapes
        params.samplesChecked = (currentSampleRate + 1) * params.numShapes;
      });

    // Add performance monitors
    pane.addBinding(params, "queryTime", {
      label: "Query Time",
      format: (v: number) => `${v.toFixed(3)}ms`,
      interval: 100,
      readonly: true,
    });

    pane.addBinding(params, "fps", {
      label: "FPS",
      format: (v: number) => `${v.toFixed(3)}`,
      interval: 100,
      readonly: true,
    });

    //GRAPH
    pane.addBinding(params, "fps", {
      label: "",
      format: (v: number) => Math.round(v).toString(),
      readonly: true,
      view: "graph",
    });

    pane.addBinding(params, "samplesChecked", {
      label: "Samples",
      readonly: true,
    });

    // Add randomize locations button
    pane
      .addButton({
        title: "Randomize Locations",
      })
      .on("click", () => {
        rerandomizePathsAndUpdate();
      });

    function rerandomizePathsAndUpdate() {
      // Re-randomize the path placements for all paths
      const newTransformedPaths = randomlyPlacePaths(svg, paths, 20);

      // Update the path highlights to match the new positions for all paths
      pathHighlights.forEach((highlight, index) => {
        if (newTransformedPaths[index]) {
          highlight.setAttribute(
            "d",
            newTransformedPaths[index].getAttribute("d") || ""
          );
        }
      });

      // Update the linear searchers with the currently active number of paths
      linearSearchers = newTransformedPaths
        .slice(0, params.numShapes)
        .map(
          (path, index) => new LinearPathSearch(path, currentSampleRate, index)
        );

      // Update sample visualizations for all paths
      newTransformedPaths.forEach((path, index) => {
        updateSampleVisualization(path, currentSampleRate, sampleGroups[index]);
      });
    }

    paneInstances.set("linear-performance-chart", { pane, params });
  }

  // Mouse tracking
  svg.addEventListener("mousemove", function (e: MouseEvent) {
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Get current number of shapes from Tweakpane
    const paneData = paneInstances.get("linear-performance-chart");
    const activeNumShapes = paneData ? paneData.params.numShapes : paths.length;

    // Search only the active paths to find the globally nearest point
    let bestResult: SearchResult | null = null;
    let minDistance = Infinity;
    let totalSamplesChecked = 0;
    const startTime = performance.now();

    // Only search the first activeNumShapes searchers
    const activeSearchers = linearSearchers.slice(0, activeNumShapes);
    activeSearchers.forEach((searcher) => {
      const result = searcher.findNearestPoint(mouseX, mouseY);
      totalSamplesChecked += result.samplesChecked || 0;

      if (result.distance < minDistance) {
        minDistance = result.distance;
        bestResult = result as SearchResult;
      }
    });

    const endTime = performance.now();

    if (bestResult !== null && bestResult) {
      const result = bestResult as SearchResult;

      // Update nearest point marker
      nearestPoint.setAttribute("cx", result.point.x.toString());
      nearestPoint.setAttribute("cy", result.point.y.toString());
      nearestPoint.style.display = "block";

      // Update connection line from cursor to nearest point
      connectionLine.setAttribute("x1", mouseX.toString());
      connectionLine.setAttribute("y1", mouseY.toString());
      connectionLine.setAttribute("x2", result.point.x.toString());
      connectionLine.setAttribute("y2", result.point.y.toString());
      connectionLine.style.display = "block";

      // Hide all path highlights first
      pathHighlights.forEach((highlight) => {
        highlight.style.display = "none";
      });

      // Show highlight for the nearest path (only if it's within the active shapes)
      if (
        result.pathIndex !== undefined &&
        result.pathIndex < activeNumShapes &&
        pathHighlights[result.pathIndex]
      ) {
        pathHighlights[result.pathIndex].style.display = "block";
      }

      // Create combined result for metrics
      const combinedResult: SearchResult = {
        point: result.point,
        distance: result.distance,
        time: endTime - startTime,
        samplesChecked: totalSamplesChecked,
        pathIndex: result.pathIndex,
      };

      // Update Tweakpane parameters
      const paneData = paneInstances.get("linear-performance-chart");
      if (paneData) {
        paneData.params.queryTime = combinedResult.time;
        paneData.params.samplesChecked = combinedResult.samplesChecked || 0;
      }

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
      const paneData = paneInstances.get("linear-performance-chart");
      if (paneData) {
        paneData.params.fps = fps;
      }
      frameCount = 0;
      lastFpsUpdate = now;
    }
  });

  svg.addEventListener("mouseleave", function () {
    nearestPoint.style.display = "none";
    connectionLine.style.display = "none";
    // Hide all path highlights
    pathHighlights.forEach((highlight) => {
      highlight.style.display = "none";
    });
  });

  // Initial sample visualization for all paths
  paths.forEach((path, index) => {
    updateSampleVisualization(path, currentSampleRate, sampleGroups[index]);

    // Set initial visibility based on initialNumShapes
    if (index < initialNumShapes) {
      path.style.display = "block";
      sampleGroups[index].style.display = "block";
    } else {
      path.style.display = "none";
      sampleGroups[index].style.display = "none";
    }
  });
}

// Demo initialization function
export async function initializeLinearDemo(): Promise<void> {
  const svg = document.getElementById("linear-svg") as SVGElement | null;
  if (!svg) return;

  try {
    // Dynamically load and parse the TEST_SHAPES.svg file
    const pathData = await loadSVGPaths(
      "/assets/images/web-demo-images/TEST_SHAPES.svg"
    );
    console.log(pathData);
    console.log(pathData.length);
    if (pathData.length === 0) {
      console.warn(
        "No paths found in TEST_SHAPES.svg, falling back to default paths"
      );
    }

    const paths: SVGPathElement[] = [];
    pathData.forEach((d, index) => {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      ) as SVGPathElement;
      path.setAttribute("d", d);
      path.setAttribute("stroke", index === 0 ? "#4a90e2" : "#e74c3c");
      path.setAttribute("stroke-width", "3");
      path.setAttribute("fill", "none");
      path.setAttribute("class", `demo-path demo-path-${index}`);
      svg.appendChild(path);
      paths.push(path);
    });

    // Randomly place the paths by default
    const transformedPaths = randomlyPlacePaths(svg, paths, 20);

    // Continue with the rest of the initialization
    initializeLinearDemoWithPaths(svg, transformedPaths);
  } catch (error) {
    console.error("Failed to load SVG paths:", error);
  }
}
