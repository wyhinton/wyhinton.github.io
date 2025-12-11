import { useEffect, useRef, useState } from "react";

export type PlaybackMode = "loop" | "ping-pong" | "reverse";

type SpritePlaybackProps = {
  src: string;          // path to sprite sheet
  rows: number;
  cols: number;
  fps?: number;
  mode?: PlaybackMode;
  autoPlay?: boolean;
  loop?: boolean;
  startFrame?: number;

  width?: number;      // force display size (px)
  height?: number;
};

export default function SpritePlayback({
  src,
  rows,
  cols,
  fps = 12,
  mode = "loop",
  autoPlay = true,
  loop = true,
  startFrame = 0,
  width,
  height,
}: SpritePlaybackProps) {
  const totalFrames = rows * cols;

  const [frame, setFrame] = useState(startFrame);
  const [playing, setPlaying] = useState(autoPlay);

  const rafRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const directionRef = useRef<number>(mode === "reverse" ? -1 : 1);

  // ---- main animation loop
  useEffect(() => {
    if (!playing) {
      cancelAnimation();
      return;
    }

    directionRef.current = mode === "reverse" ? -1 : 1;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      const interval = 1000 / fps;

      if (delta >= interval) {
        lastTimeRef.current = now;

        setFrame((prev) => {
          let next = prev + directionRef.current;

          // ---- MODE LOGIC ----

          if (mode === "ping-pong") {
            if (next >= totalFrames) {
              directionRef.current = -1;
              next = totalFrames - 2;
            }
            if (next < 0) {
              directionRef.current = 1;
              next = 1;
            }
          }

          else if (mode === "reverse") {
            if (next < 0) {
              if (!loop) return 0;
              next = totalFrames - 1;
            }
          }

          else { // loop
            if (next >= totalFrames) {
              if (!loop) return totalFrames - 1;
              next = 0;
            }
          }

          return next;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return cancelAnimation;
  }, [playing, fps, mode, loop, totalFrames]);

  const cancelAnimation = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  };

  // ---- frame positioning
  const col = frame % cols;
  const row = Math.floor(frame / cols);

  const backgroundPosition = `
    ${(col / (cols - 1 || 1)) * 100}% 
    ${(row / (rows - 1 || 1)) * 100}%
  `;

  // Ensure the src path is absolute (starts with /)
  const absoluteSrc = src.startsWith('/') ? src : `/${src}`;

  const style: React.CSSProperties = {
    backgroundImage: `url(${absoluteSrc})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition,
    width,
    height,
    imageRendering: "pixelated",
  };

  return (
    <div
      style={style}
      onClick={() => setPlaying((p) => !p)}
    />
  );
}
