// Main entry point for SVG Nearest Point demos
// Imports and initializes both linear and quadtree demos

import { initializeLinearDemo } from './linear-nearest-point-demo.js';
import { initializeQuadTreeDemo } from './quadtree-nearest-point-demo.js';

// Placeholder functions for other demos (implement as needed)
function initializePerformanceComparison(): void {
  // Implementation would go here
  console.log('Performance comparison demo not yet implemented');
}

function initializePlayground(): void {
  // Implementation would go here
  console.log('Playground demo not yet implemented');
}

// Initialize all demos when the page loads
document.addEventListener('DOMContentLoaded', function() {
  initializeLinearDemo();
  initializeQuadTreeDemo();
  initializePerformanceComparison();
  initializePlayground();
});
