import React, { useEffect, useRef, useState } from "react";
import SpritePlayback from "./SpritePlayback";
import ParticleControls from "../ParticleControls";
import {
    stepBoids,
    getButterflyState,
    updateAttractPath,
    getCurrentVerticalOffset,
    getShowParticleCenter
} from "../ParticleSystem";
import { PolylineOverlay } from "./PolylineOverlay";

const SPRITE_CONFIGS = {
    blue: { rows: 6, cols: 1, width: 64, height: 64, direction: "left" },
    blue_small: { rows: 6, cols: 1, width: 32, height: 32, direction: "left" },
    green: { rows: 6, cols: 1, width: 64, height: 64, direction: "right" }
};

// Removed hardcoded SHOW_PARTICLE_CENTER - now controlled dynamically

export default function Butterflies() {
    const [state, setState] = useState(getButterflyState());
    const [camera, setCamera] = useState({ x: 0, y: 0 });
    const [controlsVisible, setControlsVisible] = useState(false);

    // Track scroll to simulate camera
    useEffect(() => {
        const onScroll = () => {
            // setCamera({
            //     x: window.scrollX,
            //     y: window.scrollY
            // });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Animation loop
    useEffect(() => {
        let frame: number;
        const loop = (t: number) => {
            stepBoids(t);
            setState(getButterflyState());
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, []);

    // Keyboard shortcut to toggle controls (Ctrl+Shift+P)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                setControlsVisible(!controlsVisible);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [controlsVisible]);

    const ref = useRef<HTMLDivElement>(null);
    const [polyline, setPolyline] = useState<[number, number][]>([]);
    
    // Update polyline based on art-card element position
    useEffect(() => {
        const updatePolyline = () => {
            const artCardPolyline = getArtCardPolyline();
            if (artCardPolyline) {
                setPolyline(artCardPolyline);
                // Also update the particle system's attract path
                updateAttractPath(artCardPolyline);
            }
        };

        // Initial update
        updatePolyline();

        // Update on scroll and resize
        const handleUpdate = () => {
            updatePolyline();
        };

        window.addEventListener("scroll", handleUpdate, { passive: true });
        window.addEventListener("resize", handleUpdate, { passive: true });
        
        // Also update periodically in case DOM changes
        const interval = setInterval(updatePolyline, 1000);

        return () => {
            window.removeEventListener("scroll", handleUpdate);
            window.removeEventListener("resize", handleUpdate);
            clearInterval(interval);
        };
    }, []);


function getArtCardPolyline(): [number, number][] | null {
    const el = document.getElementsByClassName("art-card")[0] as HTMLElement;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let topLeft: [number, number] = [rect.left + scrollX, rect.top + scrollY];
    let topRight: [number, number] = [rect.right + scrollX, rect.top + scrollY];

    const verticalOffset = getCurrentVerticalOffset();
    topLeft[1] -= verticalOffset;
    topRight[1] -= verticalOffset;
    return [topLeft, topRight];
}

    return (
        <>
                <PolylineOverlay points={polyline} />
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    overflow: "hidden",
                    zIndex: 1,
                    height: `${document.body.scrollHeight}px`
                }}
            >

                {state.map((b, i) => {
                    // Cycle through available sprite types
                    const spriteKeys = ["blue", "blue_small", "green"] as const;
                    const spriteKey = spriteKeys[i % spriteKeys.length];
                    const sprite = SPRITE_CONFIGS[spriteKey];

                    const movingLeft = b.vx < 0;

                    const shouldFlip =
                        sprite.direction === "left"
                            ? !movingLeft
                            : movingLeft;

                    return (
                        <div
                            key={b.id}
                            style={{
                                position: "absolute",
                                left: `${b.x - camera.x}px`,
                                top: `${b.y - camera.y}px`,
                                transform: `
                                    scale(0.85)
                                    scaleX(${shouldFlip ? -1 : 1})
                                `
                            }}
                        >
                            <SpritePlayback
                                src={`assets/sprites/${spriteKey}.png`}
                                rows={sprite.rows}
                                cols={sprite.cols}
                                fps={24}
                                mode="loop"
                                width={sprite.width}
                                height={sprite.height}
                            />
                            
                            {/* Particle Center Debug Dot */}
                            {getShowParticleCenter() && (
                                <div
                                    style={{
                                        position: "absolute",
                                        left: "50%",
                                        top: "50%",
                                        width: "4px",
                                        height: "4px",
                                        backgroundColor: "red",
                                        borderRadius: "50%",
                                        transform: "translate(-50%, -50%)",
                                        pointerEvents: "none",
                                        zIndex: 10
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
            
            <ParticleControls
                isVisible={controlsVisible}
                onToggle={() => setControlsVisible(!controlsVisible)}
            />
        </>
    );
}
