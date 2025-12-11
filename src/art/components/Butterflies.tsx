import React, { useEffect, useState } from "react";
import SpritePlayback from "./SpritePlayback";
import {
    stepBoids,
    getButterflyState
} from "./ParticleSystem";

const SPRITE_CONFIGS = {
    blue: { rows: 6, cols: 1, width: 64, height: 64, direction: "left" },
    blue_small: { rows: 6, cols: 1, width: 32, height: 32, direction: "left" },
    green: { rows: 6, cols: 1, width: 64, height: 64, direction: "right" }
};

export default function Butterflies() {
    const [state, setState] = useState(getButterflyState());
    const [camera, setCamera] = useState({ x: 0, y: 0 });

    // Track scroll to simulate camera
    useEffect(() => {
        const onScroll = () => {
            setCamera({
                x: window.scrollX,
                y: window.scrollY
            });
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

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                overflow: "hidden",
                zIndex: 1
            }}
        >
            {state.map((b, i) => {
                const spriteKey = i === 0 ? "blue" : "green";
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
                    </div>
                );
            })}
        </div>
    );
}
