// butterfly-simulation.ts
import {
    alignment,
    attractPolyline,
    cohesion,
    defBoid2,
    defFlock,
    IBoidBehavior,
    separation,
    wrap2,
    type Boid,
    type BoidOpts,
} from "@thi.ng/boids";
import { HashGrid2 } from "@thi.ng/geom-accel/hash-grid";
import { isMobile } from "@thi.ng/checks";
import { defTimeStep } from "@thi.ng/timestep";
import { randMinMax2, randNorm2, ReadonlyVec, Vec } from "@thi.ng/vectors";
import { weightedRandom } from "@thi.ng/random";
import { closestPointPolyline, distToLine } from "@thi.ng/geom-closest-point";


function toReadonlyVecs(points: [number, number][]): ReadonlyVec[] {
    return points.map(([x, y]) => [x, y]);
}

export interface ButterflyBoid extends Boid {
    id: number;
    landed?: boolean;
}

function getPolylineDistanceInfo(
    boid: ButterflyBoid,
    poly: [number, number][]
) {
    // closestPointPolyline returns:
    // {
    //   point: [x, y],  // closest point ON the polyline
    //   dist: number,   // Euclidean distance from boid to that point
    //   index: number   // segment index (optional)
    // }
    return closestPointPolyline(boid.pos.value, poly as ReadonlyArray<Vec>);
}


// Converts your tuple polyline to thi.ng Vec[] (number[][])
const toVecs = (pts: [number, number][]): Vec[] =>
    pts.map(([x, y]) => [x, y]);


export function landOnPolylineBehavior(
    polyline: [number, number][],
    threshold = 20,
    closed = false
): IBoidBehavior {
    // Convert tuple → Vec[] once
    const poly: Vec[] = polyline.map(([x, y]) => [x, y]);

    return {
        weight(boid: ButterflyBoid) {
            // If already landed → no force contribution
            return boid.landed ? 0 : 1;
        },

        update(boid: ButterflyBoid): ReadonlyVec {
            // If already landed → return 0 steering
            if (boid.landed) {
                return [0, 0];
            }

            // Find closest point on the polyline
            const point = closestPointPolyline(
                boid.pos.value as ReadonlyVec,
                poly,
                closed
            );
            if (!point) return [0, 0];

            // Compute squared distance to avoid sqrt
            const dx = boid.pos.value[0] - point[0];
            const dy = boid.pos.value[1] - point[1];
            const distSq = dx * dx + dy * dy;

            if (distSq <= threshold * threshold) {
                // Mark boid as landed
                boid.landed = true;

                // Snap to path immediately
                boid.pos.value[0] = point[0];
                boid.pos.value[1] = point[1];

                return [0, 0]; // no steering force
            }

            // No steering force from this behavior until threshold reached
            return [0, 0];
        },
    };
}
// ------ WORLD CONSTANTS ------
const WIDTH = window.innerWidth;
const HEIGHT = document.body.scrollHeight;

// Expand bounds slightly so wrapping doesn’t instantly flip direction
const PAD = 0;
// const PAD = -60;
const BMIN = [PAD, PAD];
const BMAX = [WIDTH - PAD, HEIGHT - PAD];

// Max number for spatial hash initialization
const MAX_BOIDS = 10;

// Spatial hash accelerator (IMPORTANT for fast neighbor lookup)
const ACCEL = new HashGrid2<ButterflyBoid>((b) => b.pos.prev, 64, MAX_BOIDS);

// Configurable parameters
export interface ParticleParams {
    separationRadius: number;
    separationWeight: number;
    alignmentRadius: number;
    alignmentWeight: number;
    cohesionRadius: number;
    cohesionWeight: number;
    maxSpeed: number;
    numBoids: number;
    attractWeight: number;
    attractLookahead: number;
    attractClosed: boolean;
}

export const defaultParams: ParticleParams = {
    separationRadius: 60,
    separationWeight: 1.5,
    alignmentRadius: 120,
    alignmentWeight: 0.7,
    cohesionRadius: 140,
    cohesionWeight: 0.9,
    maxSpeed: 40,
    numBoids: 2,
    attractWeight: 0.5,
    attractLookahead: 1,
    attractClosed: false,
};

let currentParams = { ...defaultParams };
let attractPath: [number, number][] = [
    [100, 100],
    [200, 300],
    [400, 200],
    [600, 400],
];

function wrapBehavior(behavior: IBoidBehavior): IBoidBehavior {
    return {
        weight(boid: ButterflyBoid) {
            return boid.landed ? 0 : behavior.weight(boid);
        },
        update(boid: ButterflyBoid) {
            return boid.landed ? [0,0] : behavior.update(boid);
        }
    };
}


// Boid behavior configuration
function createOpts(): BoidOpts {
    return {
        accel: ACCEL,
        behaviors: [
            separation(currentParams.separationRadius, currentParams.separationWeight),
            alignment(currentParams.alignmentRadius, currentParams.alignmentWeight),
            cohesion(currentParams.cohesionRadius, currentParams.cohesionWeight),
            attractPolyline(
                attractPath,                    // your array of Vec2 points
                currentParams.attractClosed,    // whether the path is closed (polygon)
                currentParams.attractLookahead, // lookahead (index offset when following the path)
                currentParams.attractWeight     // weight of attraction force
            ),
            landOnPolylineBehavior(attractPath, 20),
        ],
        maxSpeed: currentParams.maxSpeed,
        constrain: wrap2(BMIN, BMAX),
    };
}

// Simulation timestep (same as example)
const sim = defTimeStep();

// Create the flock
export const flock = defFlock(
    ACCEL,
    [...Array(currentParams.numBoids)].map((_, i) =>
        defBoid2(
            randMinMax2([], BMIN, BMAX),
            randNorm2([], currentParams.maxSpeed),
            {
                ...createOpts(),
                maxSpeed: weightedRandom([20, 40, 70], [1, 4, 1])(),
            }
        )
    )
);

// Function to update parameters and recreate behaviors
export function updateParams(newParams: Partial<ParticleParams>) {
    currentParams = { ...currentParams, ...newParams };
    
    // Update existing boids with new behavior parameters
    const newOpts = createOpts();
    flock.boids.forEach(boid => {
        boid.behaviors = newOpts.behaviors;
        // Note: maxSpeed is read-only, so we need to recreate boids to change it
    });
    
    // If number of boids changed or maxSpeed changed, recreate the flock
    if ((newParams.numBoids && newParams.numBoids !== flock.boids.length) || 
        newParams.maxSpeed !== undefined) {
        recreateFlock(currentParams.numBoids);
    }
}

// Function to recreate flock with different number of boids
function recreateFlock(numBoids: number) {
    flock.boids.length = 0;
    ACCEL.clear();
    
    for (let i = 0; i < numBoids; i++) {
        const boid = defBoid2(
            randMinMax2([], BMIN, BMAX),
            randNorm2([], currentParams.maxSpeed),
            {
                ...createOpts(),
                maxSpeed: weightedRandom([20, 40, 70], [1, 4, 1])(),
            }
        );
        flock.boids.push(boid);
    }
}

// Function to get current parameters
export function getCurrentParams(): ParticleParams {
    return { ...currentParams };
}

// Function to update the attract path
export function updateAttractPath(newPath: [number, number][]) {
    attractPath = newPath;
    
    // Update existing boids with new behavior parameters
    const newOpts = createOpts();
    flock.boids.forEach(boid => {
        boid.behaviors = newOpts.behaviors;
    });
}

// Function to get current attract path
export function getCurrentAttractPath(): [number, number][] {
    return [...attractPath];
}

// Wrapper around simulation update
export function stepBoids(time: number) {
    sim.update(time, [flock]);

    // Freeze landed boids
    for (const b of flock.boids) {
        //@ts-ignore
        console.log(b.landed)
        //@ts-ignore
        if (b.landed) {
            b.vel.value[0] = 0;
            b.vel.value[1] = 0;
        }
    }
}
// Helper to read current boid state
export function getButterflyState() {
    return flock.boids.map((b) => ({
        //@ts-ignore
        id: b.id,
        x: b.pos.value[0],
        y: b.pos.value[1],
        vx: b.vel.value[0],
        vy: b.vel.value[1],
    }));
}
