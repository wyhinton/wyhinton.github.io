import React, { useState, useEffect, useRef } from 'react';
import SpritePlayback from './SpritePlayback';

interface Butterfly {
  id: number;
  sprite: 'blue' | 'blue_small' | 'green';
  duration: number;
  startTime: number;
  initialX: number;
  initialY: number;
  scale: number;
  noise: PerlinNoise;
}

const SPRITE_CONFIGS = {
  blue: { rows: 6, cols: 1, width: 64, height: 64, direction: "left" },
  blue_small: { rows: 6, cols: 1, width: 32, height: 32, direction: "left" },
  green: { rows: 6, cols: 1, width: 64, height: 64, direction: "right" }
};

// Smooth pseudo-perlin noise
class PerlinNoise {
  constructor(public seed: number) {}

  noise(x: number): number {
    return (Math.sin(x * 12.9898 + this.seed * 78.233) * 43758.5453) % 1;
  }

  smoothNoise(t: number): number {
    const i = Math.floor(t);
    const f = t - i;
    const n1 = this.noise(i);
    const n2 = this.noise(i + 1);
    return n1 * (1 - f) + n2 * f;
  }
}

export default function Butterflies() {
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const nextId = useRef(0);

  // Store last position for direction detection
  const lastPositions = useRef<Record<number, { x: number; y: number }>>({});

  // Spawn butterflies (1–2 max)
  useEffect(() => {
    const createButterfly = () => {
      const keys = Object.keys(SPRITE_CONFIGS) as Array<'blue' | 'blue_small' | 'green'>;
      const sprite = keys[Math.floor(Math.random() * keys.length)];
      const duration = 9000 + Math.random() * 8000;

      const newButterfly: Butterfly = {
        id: nextId.current++,
        sprite,
        duration,
        startTime: Date.now(),
        initialX: 20 + Math.random() * 60,
        initialY: 20 + Math.random() * 60,
        scale: 0.5 + Math.random() * 0.8,
        noise: new PerlinNoise(Math.random() * 10000)
      };

      setButterflies(prev => [...prev.slice(-1), newButterfly]); // keep only 2
    };

    createButterfly();
    const interval = setInterval(createButterfly, 9000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup expired butterflies
  useEffect(() => {
    const cleanup = setInterval(() => {
      setButterflies(prev =>
        prev.filter(b => Date.now() - b.startTime < b.duration)
      );
    }, 1);
    return () => clearInterval(cleanup);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1
      }}
    >
      {butterflies.map(b => {
        const config = SPRITE_CONFIGS[b.sprite];
        const elapsed = (Date.now() - b.startTime) / 1000;

        // Brownian-ish wandering motion
        const nx = b.noise.smoothNoise(elapsed * 0.4);
        const ny = b.noise.smoothNoise(elapsed * 0.4 + 100);

        const xOffset = (nx - 0.5) * 40 + Math.sin(elapsed * 0.6 + b.id) * 12;
        const yOffset = (ny - 0.5) * 40 + Math.cos(elapsed * 0.6 + b.id) * 12;

        const x = b.initialX + xOffset;
        const y = b.initialY + yOffset;

        // --- Detect movement direction (velocity on X axis) ---
        const last = lastPositions.current[b.id] || { x, y };
        const dx = x - last.x;

        lastPositions.current[b.id] = { x, y };

        // If dx < 0 -> moving left, dx > 0 -> moving right
        const movingLeft = dx < 0;

        // Determine if sprite SHOULD flip relative to its default orientation
        let shouldFlip = false;

        if (config.direction === "left") {
          // Default faces left
          shouldFlip = !movingLeft;
        } else {
          // Default faces right
          shouldFlip = movingLeft;
        }

        return (
          <div
            key={b.id}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: `
                scale(${b.scale})
                scaleX(${shouldFlip ? -1 : 1})
              `,
              transition: "none",
              opacity: 1,
            }}
          >
            <SpritePlayback
              src={`assets/sprites/${b.sprite}.png`}
              rows={config.rows}
              cols={config.cols}
              fps={24}
              mode="loop"
              width={config.width}
              height={config.height}
            />
          </div>
        );
      })}
    </div>
  );
}
