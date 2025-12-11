// butterfly-simulation.ts
import {
    alignment,
    cohesion,
    defBoid2,
    defFlock,
    separation,
    wrap2,
    type Boid,
    type BoidOpts,
} from "@thi.ng/boids";
import { HashGrid2 } from "@thi.ng/geom-accel/hash-grid";
import { isMobile } from "@thi.ng/checks";
import { defTimeStep } from "@thi.ng/timestep";
import { randMinMax2, randNorm2 } from "@thi.ng/vectors";
import { weightedRandom } from "@thi.ng/random";

export interface ButterflyBoid extends Boid {
    id: number;
}

// ------ WORLD CONSTANTS ------
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

// Expand bounds slightly so wrapping doesn’t instantly flip direction
const PAD = -60;
const BMIN = [PAD, PAD];
const BMAX = [WIDTH - PAD, HEIGHT - PAD];

const NUM = 2; // only 2 butterflies on screen max

// Spatial hash accelerator (IMPORTANT for fast neighbor lookup)
const ACCEL = new HashGrid2<ButterflyBoid>((b) => b.pos.prev, 64, NUM);

// Boid behavior configuration
const OPTS: BoidOpts = {
    accel: ACCEL,
    behaviors: [
        separation(60, 1.5),
        alignment(120, 0.7),
        cohesion(140, 0.9),
    ],
    maxSpeed: 40,
    constrain: wrap2(BMIN, BMAX),
};

// Simulation timestep (same as example)
const sim = defTimeStep();

// Create the flock
export const flock = defFlock(
    ACCEL,
    [...Array(NUM)].map((_, i) =>
        defBoid2(
            randMinMax2([], BMIN, BMAX),
            randNorm2([], OPTS.maxSpeed),
            {
                ...OPTS,
                maxSpeed: weightedRandom([20, 40, 70], [1, 4, 1])(),
            }
        )
    )
);

// Wrapper around simulation update
export function stepBoids(time: number) {
    // The thi.ng timestep system expects: sim.update(currentTimestamp, [flock])
    sim.update(time, [flock]);
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
