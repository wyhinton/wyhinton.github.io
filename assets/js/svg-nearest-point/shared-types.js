// src/ts/svg-nearest-point/shared-types.ts
async function loadSVGPaths(svgUrl) {
  try {
    const response = await fetch(svgUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.status}`);
    }
    const svgText = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
    const parseError = svgDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("Failed to parse SVG");
    }
    const pathElements = svgDoc.querySelectorAll("path");
    const pathData = [];
    console.log(pathElements);
    pathElements.forEach((path) => {
      const d = path.getAttribute("d");
      if (d) {
        pathData.push(d);
      }
    });
    return pathData;
  } catch (error) {
    console.error("Error loading SVG paths:", error);
    return [];
  }
}
var QuadTreeNode = class _QuadTreeNode {
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
    if (!this.contains(point)) return false;
    if (this.points.length < this.maxPoints || this.depth >= this.maxDepth) {
      this.points.push(point);
      return true;
    }
    if (!this.divided) {
      this.subdivide();
    }
    return !!(this.children.nw.insert(point) || this.children.ne.insert(point) || this.children.sw.insert(point) || this.children.se.insert(point));
  }
  subdivide() {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    this.children = {
      nw: new _QuadTreeNode(
        { x, y, width: halfWidth, height: halfHeight },
        this.maxPoints,
        this.maxDepth,
        this.depth + 1
      ),
      ne: new _QuadTreeNode(
        { x: x + halfWidth, y, width: halfWidth, height: halfHeight },
        this.maxPoints,
        this.maxDepth,
        this.depth + 1
      ),
      sw: new _QuadTreeNode(
        { x, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxPoints,
        this.maxDepth,
        this.depth + 1
      ),
      se: new _QuadTreeNode(
        { x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight },
        this.maxPoints,
        this.maxDepth,
        this.depth + 1
      )
    };
    this.divided = true;
    for (const point of this.points) {
      this.children.nw.insert(point) || this.children.ne.insert(point) || this.children.sw.insert(point) || this.children.se.insert(point);
    }
    this.points = [];
  }
  contains(point) {
    return point.x >= this.bounds.x && point.x < this.bounds.x + this.bounds.width && point.y >= this.bounds.y && point.y < this.bounds.y + this.bounds.height;
  }
  query(range, found = []) {
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
  intersects(range) {
    return !(range.x > this.bounds.x + this.bounds.width || range.x + range.width < this.bounds.x || range.y > this.bounds.y + this.bounds.height || range.y + range.height < this.bounds.y);
  }
  pointInRange(point, range) {
    return point.x >= range.x && point.x <= range.x + range.width && point.y >= range.y && point.y <= range.y + range.height;
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
  getContainingBounds(point) {
    if (this.contains(point) && this.points.includes(point)) {
      return this.bounds;
    }
    if (this.divided && this.children) {
      const childResult = this.children.nw.getContainingBounds(point) || this.children.ne.getContainingBounds(point) || this.children.sw.getContainingBounds(point) || this.children.se.getContainingBounds(point);
      if (childResult) return childResult;
    }
    return null;
  }
};
function centerPathsInSVG(svg) {
  const paths = svg.querySelectorAll("path");
  if (paths.length === 0) return;
  const svgRect = svg.getBoundingClientRect();
  const svgWidth = svgRect.width || parseFloat(svg.getAttribute("width") || "800");
  const svgHeight = svgRect.height || parseFloat(svg.getAttribute("height") || "600");
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  paths.forEach((path) => {
    const bbox = path.getBBox();
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  });
  const pathsWidth = maxX - minX;
  const pathsHeight = maxY - minY;
  const pathsCenterX = minX + pathsWidth / 2;
  const pathsCenterY = minY + pathsHeight / 2;
  const svgCenterX = svgWidth / 2;
  const svgCenterY = svgHeight / 2;
  const offsetX = svgCenterX - pathsCenterX;
  const offsetY = svgCenterY - pathsCenterY;
  if (Math.abs(offsetX) > 0.1 || Math.abs(offsetY) > 0.1) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("transform", `translate(${offsetX}, ${offsetY})`);
    const pathsArray = Array.from(paths);
    pathsArray.forEach((path) => {
      svg.removeChild(path);
      group.appendChild(path);
    });
    svg.appendChild(group);
  }
}
function translatePathData(pathData, offsetX, offsetY) {
  return pathData.replace(/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi, (match, command, coords) => {
    const isRelative = command === command.toLowerCase();
    const upperCommand = command.toUpperCase();
    if (upperCommand === "Z") {
      return match;
    }
    const numbers = coords.match(/-?\d*\.?\d+/g);
    if (!numbers) return match;
    let modifiedNumbers = [];
    switch (upperCommand) {
      case "M":
      case "L":
      case "T":
        for (let i = 0; i < numbers.length; i += 2) {
          const x = parseFloat(numbers[i]);
          const y = parseFloat(numbers[i + 1]);
          modifiedNumbers.push(
            (isRelative ? x : x + offsetX).toString(),
            (isRelative ? y : y + offsetY).toString()
          );
        }
        break;
      case "H":
        for (let i = 0; i < numbers.length; i++) {
          const x = parseFloat(numbers[i]);
          modifiedNumbers.push((isRelative ? x : x + offsetX).toString());
        }
        break;
      case "V":
        for (let i = 0; i < numbers.length; i++) {
          const y = parseFloat(numbers[i]);
          modifiedNumbers.push((isRelative ? y : y + offsetY).toString());
        }
        break;
      case "C":
        for (let i = 0; i < numbers.length; i += 6) {
          const x1 = parseFloat(numbers[i]);
          const y1 = parseFloat(numbers[i + 1]);
          const x2 = parseFloat(numbers[i + 2]);
          const y2 = parseFloat(numbers[i + 3]);
          const x = parseFloat(numbers[i + 4]);
          const y = parseFloat(numbers[i + 5]);
          modifiedNumbers.push(
            (isRelative ? x1 : x1 + offsetX).toString(),
            (isRelative ? y1 : y1 + offsetY).toString(),
            (isRelative ? x2 : x2 + offsetX).toString(),
            (isRelative ? y2 : y2 + offsetY).toString(),
            (isRelative ? x : x + offsetX).toString(),
            (isRelative ? y : y + offsetY).toString()
          );
        }
        break;
      case "S":
      case "Q":
        for (let i = 0; i < numbers.length; i += 4) {
          const x1 = parseFloat(numbers[i]);
          const y1 = parseFloat(numbers[i + 1]);
          const x = parseFloat(numbers[i + 2]);
          const y = parseFloat(numbers[i + 3]);
          modifiedNumbers.push(
            (isRelative ? x1 : x1 + offsetX).toString(),
            (isRelative ? y1 : y1 + offsetY).toString(),
            (isRelative ? x : x + offsetX).toString(),
            (isRelative ? y : y + offsetY).toString()
          );
        }
        break;
      case "A":
        for (let i = 0; i < numbers.length; i += 7) {
          const rx = parseFloat(numbers[i]);
          const ry = parseFloat(numbers[i + 1]);
          const rotation = parseFloat(numbers[i + 2]);
          const largeArc = parseFloat(numbers[i + 3]);
          const sweep = parseFloat(numbers[i + 4]);
          const x = parseFloat(numbers[i + 5]);
          const y = parseFloat(numbers[i + 6]);
          modifiedNumbers.push(
            rx.toString(),
            ry.toString(),
            rotation.toString(),
            largeArc.toString(),
            sweep.toString(),
            (isRelative ? x : x + offsetX).toString(),
            (isRelative ? y : y + offsetY).toString()
          );
        }
        break;
      default:
        return match;
    }
    return command + modifiedNumbers.join(",");
  });
}
function randomlyPlacePaths(svg, paths, padding = 20) {
  if (paths.length === 0) return paths;
  const svgRect = svg.getBoundingClientRect();
  const svgWidth = svgRect.width;
  const svgHeight = svgRect.height;
  const pathBounds = paths.map((path) => {
    const bbox = path.getBBox();
    return {
      path,
      width: bbox.width,
      height: bbox.height,
      originalBBox: bbox,
      originalPathData: path.getAttribute("d") || ""
    };
  });
  const placedBounds = [];
  function wouldOverlap(x, y, width, height) {
    return placedBounds.some((placed) => {
      return !(x + width + padding < placed.x || x > placed.x + placed.width + padding || y + height + padding < placed.y || y > placed.y + placed.height + padding);
    });
  }
  function findValidPosition(width, height, maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      const x = padding + Math.random() * (svgWidth - width - 2 * padding);
      const y = padding + Math.random() * (svgHeight - height - 2 * padding);
      if (!wouldOverlap(x, y, width, height)) {
        return { x, y };
      }
    }
    return null;
  }
  pathBounds.forEach(({ path, width, height, originalBBox, originalPathData }) => {
    const position = findValidPosition(width, height);
    if (position) {
      const offsetX = position.x - originalBBox.x;
      const offsetY = position.y - originalBBox.y;
      const newPathData = translatePathData(originalPathData, offsetX, offsetY);
      path.setAttribute("d", newPathData);
      placedBounds.push({
        x: position.x,
        y: position.y,
        width,
        height
      });
    } else {
      console.warn("Could not find non-overlapping position for path, using fallback");
      const fallbackX = padding + placedBounds.length * 50 % (svgWidth - width - 2 * padding);
      const fallbackY = padding + Math.floor(placedBounds.length * 50 / (svgWidth - width - 2 * padding)) * 60;
      const offsetX = fallbackX - originalBBox.x;
      const offsetY = fallbackY - originalBBox.y;
      const newPathData = translatePathData(originalPathData, offsetX, offsetY);
      path.setAttribute("d", newPathData);
      placedBounds.push({
        x: fallbackX,
        y: fallbackY,
        width,
        height
      });
    }
  });
  return paths;
}
export {
  QuadTreeNode,
  centerPathsInSVG,
  loadSVGPaths,
  randomlyPlacePaths
};
//# sourceMappingURL=shared-types.js.map
