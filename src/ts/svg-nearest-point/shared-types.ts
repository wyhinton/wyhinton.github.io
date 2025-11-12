// Shared interfaces and types for SVG nearest point demos

export interface Point {
  x: number;
  y: number;
}

export interface SearchResult {
  point: Point;
  distance: number;
  time: number;
  samplesChecked?: number;
  pathIndex?: number;
}

export interface QuadTreeSearchResult extends SearchResult {
  candidatesChecked: number;
  searchRadius: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuadTreePoint extends Point {
  pathIndex: number;
  t: number;
  path: SVGPathElement;
}

export interface QuadTreeChildren {
  nw: QuadTreeNode;
  ne: QuadTreeNode;
  sw: QuadTreeNode;
  se: QuadTreeNode;
}

// Shared utility functions
export async function loadSVGPaths(svgUrl: string): Promise<string[]> {
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
    const pathData: string[] = [];
    console.log(pathElements)
    
    pathElements.forEach(path => {
      const d = path.getAttribute('d');
      if (d) {
        pathData.push(d);
      }
    });
    
    return pathData;
  } catch (error) {
    console.error('Error loading SVG paths:', error);
    return [];
  }
}

// QuadTree implementation
export class QuadTreeNode {
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

  getAllBounds(): Bounds[] {
    const bounds = [this.bounds];
    if (this.divided && this.children) {
      bounds.push(...this.children.nw.getAllBounds());
      bounds.push(...this.children.ne.getAllBounds());
      bounds.push(...this.children.sw.getAllBounds());
      bounds.push(...this.children.se.getAllBounds());
    }
    return bounds;
  }

  getContainingBounds(point: QuadTreePoint): Bounds | null {
    // Check if this node contains the point and has the point in its list
    if (this.contains(point) && this.points.includes(point)) {
      return this.bounds;
    }

    // If divided, check children
    if (this.divided && this.children) {
      const childResult = 
        this.children.nw.getContainingBounds(point) ||
        this.children.ne.getContainingBounds(point) ||
        this.children.sw.getContainingBounds(point) ||
        this.children.se.getContainingBounds(point);
      
      if (childResult) return childResult;
    }

    return null;
  }
}

// Utility function to center all path elements within an SVG
export function centerPathsInSVG(svg: SVGSVGElement): void {
  const paths = svg.querySelectorAll('path');
  if (paths.length === 0) return;

  // Get the SVG dimensions
  const svgRect = svg.getBoundingClientRect();
  const svgWidth = svgRect.width || parseFloat(svg.getAttribute('width') || '800');
  const svgHeight = svgRect.height || parseFloat(svg.getAttribute('height') || '600');

  // Calculate bounding box of all paths
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  paths.forEach(path => {
    const bbox = path.getBBox();
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  });

  // Calculate the center offset needed
  const pathsWidth = maxX - minX;
  const pathsHeight = maxY - minY;
  const pathsCenterX = minX + pathsWidth / 2;
  const pathsCenterY = minY + pathsHeight / 2;
  const svgCenterX = svgWidth / 2;
  const svgCenterY = svgHeight / 2;

  const offsetX = svgCenterX - pathsCenterX;
  const offsetY = svgCenterY - pathsCenterY;

  // Apply the transform to center the paths
  if (Math.abs(offsetX) > 0.1 || Math.abs(offsetY) > 0.1) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('transform', `translate(${offsetX}, ${offsetY})`);
    
    // Move all paths into the group
    const pathsArray = Array.from(paths);
    pathsArray.forEach(path => {
      svg.removeChild(path);
      group.appendChild(path);
    });
    
    svg.appendChild(group);
  }
}

// Helper function to parse and modify path data
function translatePathData(pathData: string, offsetX: number, offsetY: number): string {
  // Simple path parser that handles M, L, H, V, C, S, Q, T, A, Z commands
  // This handles both absolute and relative commands
  return pathData.replace(/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi, (match, command, coords) => {
    const isRelative = command === command.toLowerCase();
    const upperCommand = command.toUpperCase();
    
    if (upperCommand === 'Z') {
      return match; // Z has no coordinates
    }
    
    const numbers = coords.match(/-?\d*\.?\d+/g);
    if (!numbers) return match;
    
    let modifiedNumbers: string[] = [];
    
    switch (upperCommand) {
      case 'M':
      case 'L':
      case 'T':
        // x, y coordinates
        for (let i = 0; i < numbers.length; i += 2) {
          const x = parseFloat(numbers[i]);
          const y = parseFloat(numbers[i + 1]);
          modifiedNumbers.push(
            (isRelative ? x : x + offsetX).toString(),
            (isRelative ? y : y + offsetY).toString()
          );
        }
        break;
      
      case 'H':
        // horizontal line (x coordinate only)
        for (let i = 0; i < numbers.length; i++) {
          const x = parseFloat(numbers[i]);
          modifiedNumbers.push((isRelative ? x : x + offsetX).toString());
        }
        break;
      
      case 'V':
        // vertical line (y coordinate only)
        for (let i = 0; i < numbers.length; i++) {
          const y = parseFloat(numbers[i]);
          modifiedNumbers.push((isRelative ? y : y + offsetY).toString());
        }
        break;
      
      case 'C':
        // cubic bezier (x1,y1 x2,y2 x,y)
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
      
      case 'S':
      case 'Q':
        // smooth cubic bezier or quadratic bezier (x1,y1 x,y)
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
      
      case 'A':
        // arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
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
        return match; // Unknown command, leave as is
    }
    
    return command + modifiedNumbers.join(',');
  });
}

// Random placement utility for non-overlapping bounding boxes with padding
export function randomlyPlacePaths(svg: SVGElement, paths: SVGPathElement[], padding: number = 20): SVGPathElement[] {
  if (paths.length === 0) return paths;

  const svgRect = svg.getBoundingClientRect();
  const svgWidth = svgRect.width;
  const svgHeight = svgRect.height;

  // Calculate bounding boxes for all paths (before any modifications)
  const pathBounds = paths.map(path => {
    const bbox = path.getBBox();
    return {
      path,
      width: bbox.width,
      height: bbox.height,
      originalBBox: bbox,
      originalPathData: path.getAttribute('d') || ''
    };
  });

  // Track placed positions to avoid overlaps
  const placedBounds: Array<{ x: number; y: number; width: number; height: number }> = [];

  // Function to check if a position would overlap with existing placements
  function wouldOverlap(x: number, y: number, width: number, height: number): boolean {
    return placedBounds.some(placed => {
      return !(x + width + padding < placed.x ||
               x > placed.x + placed.width + padding ||
               y + height + padding < placed.y ||
               y > placed.y + placed.height + padding);
    });
  }

  // Function to find a valid random position
  function findValidPosition(width: number, height: number, maxAttempts: number = 100): { x: number; y: number } | null {
    for (let i = 0; i < maxAttempts; i++) {
      const x = padding + Math.random() * (svgWidth - width - 2 * padding);
      const y = padding + Math.random() * (svgHeight - height - 2 * padding);
      
      if (!wouldOverlap(x, y, width, height)) {
        return { x, y };
      }
    }
    return null;
  }

  // Place each path randomly by modifying its path data
  pathBounds.forEach(({ path, width, height, originalBBox, originalPathData }) => {
    const position = findValidPosition(width, height);
    
    if (position) {
      // Calculate the offset needed to move the path to the new position
      const offsetX = position.x - originalBBox.x;
      const offsetY = position.y - originalBBox.y;
      
      // Modify the path data directly
      const newPathData = translatePathData(originalPathData, offsetX, offsetY);
      path.setAttribute('d', newPathData);
      
      // Record the placed bounds
      placedBounds.push({
        x: position.x,
        y: position.y,
        width,
        height
      });
    } else {
      // If we couldn't find a valid position, place it in a fallback location
      console.warn('Could not find non-overlapping position for path, using fallback');
      const fallbackX = padding + (placedBounds.length * 50) % (svgWidth - width - 2 * padding);
      const fallbackY = padding + Math.floor((placedBounds.length * 50) / (svgWidth - width - 2 * padding)) * 60;
      
      const offsetX = fallbackX - originalBBox.x;
      const offsetY = fallbackY - originalBBox.y;
      
      // Modify the path data directly
      const newPathData = translatePathData(originalPathData, offsetX, offsetY);
      path.setAttribute('d', newPathData);
      
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
