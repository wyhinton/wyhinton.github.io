// PolylineOverlay.tsx
export function PolylineOverlay({
    points,
    stroke = "#ff00ff",
    strokeWidth = 2,
}: {
    points: [number, number][];
    stroke?: string;
    strokeWidth?: number;
}) {
    // const path = points.map((p) => `${p[0]},${p[1]}`).join(" ");
    const path = points.map((p) => `${p[0]},${p[1] + 25}`).join(" ");

    return (
        <svg
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100vw",
                height: `${document.body.scrollHeight}px`,
                pointerEvents: "none",
                zIndex: 100,
            }}
        >
            <polyline
                points={path}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
            />
        </svg>
    );
}