import { Pane } from "tweakpane";
import { params } from "./params";

export function createDebugPane(onChange: () => void) {
    const pane = new Pane({ title: "Boid Controls" });

    const fForces = pane.addFolder({ title: "Forces" });

    fForces.addBinding(params, "separationDist", {
        min: 10, max: 200, step: 1, label: "Separation Dist",
    }).on("change", onChange);

    fForces.addBinding(params, "separationStrength", {
        min: 0, max: 3, step: 0.1, label: "Separation Str",
    }).on("change", onChange);

    fForces.addBinding(params, "alignmentDist", {
        min: 20, max: 300, step: 1, label: "Alignment Dist",
    }).on("change", onChange);

    fForces.addBinding(params, "alignmentStrength", {
        min: 0, max: 3, step: 0.1, label: "Alignment Str",
    }).on("change", onChange);

    fForces.addBinding(params, "cohesionDist", {
        min: 20, max: 300, step: 1, label: "Cohesion Dist",
    }).on("change", onChange);

    fForces.addBinding(params, "cohesionStrength", {
        min: 0, max: 3, step: 0.1, label: "Cohesion Str",
    }).on("change", onChange);

    const fSim = pane.addFolder({ title: "Simulation" });

    fSim.addBinding(params, "maxSpeed", {
        min: 5, max: 150, step: 1, label: "Max Speed",
    }).on("change", onChange);

    fSim.addBinding(params, "PAD", {
        min: -200, max: 200, step: 1, label: "Pad Wrap",
    }).on("change", onChange);

    fSim.addBinding(params, "numBoids", {
        min: 1, max: 100, step: 1, label: "Boid Count",
    }).on("change", onChange);

    return pane;
}
