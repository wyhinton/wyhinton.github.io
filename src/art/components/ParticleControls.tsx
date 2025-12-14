import React, { useState, useEffect } from "react";
import { 
    ParticleParams, 
    defaultParams, 
    updateParams, 
    getCurrentParams,
    getCurrentAttractPath,
    getBoidDetails,
    resetLandedState
} from "./ParticleSystem";

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onChange }) => {
    return (
        <div style={{ marginBottom: "12px" }}>
            <label style={{ 
                display: "block", 
                fontSize: "12px", 
                fontWeight: "bold",
                marginBottom: "4px",
                color: "#333"
            }}>
                {label}: {value.toFixed(1)}
            </label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{
                    width: "100%",
                    height: "6px",
                    borderRadius: "3px",
                    background: "#ddd",
                    outline: "none",
                    cursor: "pointer"
                }}
            />
        </div>
    );
};

interface ParticleControlsProps {
    isVisible: boolean;
    onToggle: () => void;
}

export default function ParticleControls({ isVisible, onToggle }: ParticleControlsProps) {
    const [params, setParams] = useState<ParticleParams>(getCurrentParams());
    const [worldDimensions, setWorldDimensions] = useState({ 
        width: window.innerWidth, 
        height: document.body.scrollHeight 
    });
    const [attractPath, setAttractPath] = useState<[number, number][]>([]);
    const [boidDetails, setBoidDetails] = useState<any>(null);

    // Update world dimensions and attract path periodically
    useEffect(() => {
        const updateDisplayInfo = () => {
            setWorldDimensions({
                width: Math.max(
                    document.body.scrollWidth,
                    document.body.offsetWidth,
                    document.documentElement.clientWidth,
                    document.documentElement.scrollWidth,
                    document.documentElement.offsetWidth
                ),
                height: Math.max(
                    document.body.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.clientHeight,
                    document.documentElement.scrollHeight,
                    document.documentElement.offsetHeight
                )
            });
            setAttractPath(getCurrentAttractPath());
            setBoidDetails(getBoidDetails(0)); // Get details for particle[0]
        };

        updateDisplayInfo();
        const interval = setInterval(updateDisplayInfo, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleParamChange = <K extends keyof ParticleParams>(
        key: K, 
        value: ParticleParams[K]
    ) => {
        const newParams = { ...params, [key]: value };
        setParams(newParams);
        updateParams({ [key]: value });
    };

    const resetParams = () => {
        setParams(defaultParams);
        updateParams(defaultParams);
    };

    return (
        <>

            {/* Toggle Button */}
            <button
                onClick={onToggle}
                style={{
                    position: "fixed",
                    top: "20px",
                    right: "20px",
                    zIndex: 1000,
                    padding: "10px 15px",
                    backgroundColor: "#007acc",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                }}
            >
                {isVisible ? "Hide Controls" : "Show Controls"}
            </button>

            {/* Controls Panel */}
            {isVisible && (
                <div
                    style={{
                        position: "fixed",
                        top: "70px",
                        right: "20px",
                        width: "600px", // Increased width for two columns
                        maxHeight: "calc(100vh - 100px)",
                        overflowY: "auto",
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "16px",
                        zIndex: 1000,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        fontFamily: "Arial, sans-serif"
                    }}
                >
                    <h3 style={{ 
                        margin: "0 0 16px 0", 
                        fontSize: "16px", 
                        color: "#333",
                        borderBottom: "2px solid #007acc",
                        paddingBottom: "8px"
                    }}>
                        Particle System Controls
                    </h3>

                    {/* Two Column Layout */}
                    <div style={{ display: "flex", gap: "20px" }}>
                        
                        {/* Left Column - Controls */}
                        <div style={{ flex: 1 }}>
                            <Slider
                        label="Number of Boids"
                        value={params.numBoids}
                        min={1}
                        max={10}
                        step={1}
                        onChange={(value) => handleParamChange("numBoids", value)}
                    />

                    <Slider
                        label="Max Speed"
                        value={params.maxSpeed}
                        min={10}
                        max={200}
                        step={5}
                        onChange={(value) => handleParamChange("maxSpeed", value)}
                    />

                    <h4 style={{ 
                        margin: "20px 0 12px 0", 
                        fontSize: "14px", 
                        color: "#555",
                        borderBottom: "1px solid #ddd",
                        paddingBottom: "4px"
                    }}>
                        Separation Behavior
                    </h4>

                    <Slider
                        label="Separation Radius"
                        value={params.separationRadius}
                        min={20}
                        max={200}
                        step={10}
                        onChange={(value) => handleParamChange("separationRadius", value)}
                    />

                    <Slider
                        label="Separation Weight"
                        value={params.separationWeight}
                        min={0}
                        max={3}
                        step={0.1}
                        onChange={(value) => handleParamChange("separationWeight", value)}
                    />

                    <h4 style={{ 
                        margin: "20px 0 12px 0", 
                        fontSize: "14px", 
                        color: "#555",
                        borderBottom: "1px solid #ddd",
                        paddingBottom: "4px"
                    }}>
                        Alignment Behavior
                    </h4>

                    <Slider
                        label="Alignment Radius"
                        value={params.alignmentRadius}
                        min={50}
                        max={300}
                        step={10}
                        onChange={(value) => handleParamChange("alignmentRadius", value)}
                    />

                    <Slider
                        label="Alignment Weight"
                        value={params.alignmentWeight}
                        min={0}
                        max={2}
                        step={0.1}
                        onChange={(value) => handleParamChange("alignmentWeight", value)}
                    />

                    <h4 style={{ 
                        margin: "20px 0 12px 0", 
                        fontSize: "14px", 
                        color: "#555",
                        borderBottom: "1px solid #ddd",
                        paddingBottom: "4px"
                    }}>
                        Cohesion Behavior
                    </h4>

                    <Slider
                        label="Cohesion Radius"
                        value={params.cohesionRadius}
                        min={50}
                        max={300}
                        step={10}
                        onChange={(value) => handleParamChange("cohesionRadius", value)}
                    />

                    <Slider
                        label="Cohesion Weight"
                        value={params.cohesionWeight}
                        min={0}
                        max={2}
                        step={0.1}
                        onChange={(value) => handleParamChange("cohesionWeight", value)}
                    />

                    <h4 style={{ 
                        margin: "20px 0 12px 0", 
                        fontSize: "14px", 
                        color: "#555",
                        borderBottom: "1px solid #ddd",
                        paddingBottom: "4px"
                    }}>
                        Attract Path Behavior
                    </h4>

                    <Slider
                        label="Attract Weight"
                        value={params.attractWeight}
                        min={0}
                        max={2}
                        step={0.1}
                        onChange={(value) => handleParamChange("attractWeight", value)}
                    />

                    <Slider
                        label="Attract Lookahead"
                        value={params.attractLookahead}
                        min={0}
                        max={5}
                        step={1}
                        onChange={(value) => handleParamChange("attractLookahead", value)}
                    />

                    <Slider
                        label="Landing Threshold"
                        value={params.landingThreshold}
                        min={1}
                        max={20000}
                        step={1}
                        onChange={(value) => handleParamChange("landingThreshold", value)}
                    />

                    <Slider
                        label="Vertical Offset"
                        value={params.verticalOffset}
                        min={-50}
                        max={50}
                        step={1}
                        onChange={(value) => handleParamChange("verticalOffset", value)}
                    />

                    <div style={{ marginBottom: "12px" }}>
                        <label style={{ 
                            display: "block", 
                            fontSize: "12px", 
                            fontWeight: "bold",
                            marginBottom: "4px",
                            color: "#333"
                        }}>
                            Closed Path: {params.attractClosed ? "Yes" : "No"}
                        </label>
                        <input
                            type="checkbox"
                            checked={params.attractClosed}
                            onChange={(e) => handleParamChange("attractClosed", e.target.checked)}
                            style={{
                                cursor: "pointer",
                                transform: "scale(1.2)"
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                        <label style={{ 
                            display: "block", 
                            fontSize: "12px", 
                            fontWeight: "bold",
                            marginBottom: "4px",
                            color: "#333"
                        }}>
                            Show Particle Center: {params.showParticleCenter ? "Yes" : "No"}
                        </label>
                        <input
                            type="checkbox"
                            checked={params.showParticleCenter}
                            onChange={(e) => handleParamChange("showParticleCenter", e.target.checked)}
                            style={{
                                cursor: "pointer",
                                transform: "scale(1.2)"
                            }}
                        />
                    </div>

                            <button
                                onClick={resetLandedState}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    marginTop: "16px",
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "bold"
                                }}
                            >
                                Reset Landed State
                            </button>

                            <button
                                onClick={resetParams}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    marginTop: "8px",
                                    backgroundColor: "#dc3545",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "bold"
                                }}
                            >
                                Reset to Defaults
                            </button>
                        </div>

                        {/* Right Column - Display Information */}
                        <div style={{ 
                            flex: 1, 
                            borderLeft: "1px solid #ddd", 
                            paddingLeft: "20px" 
                        }}>
                            <h4 style={{ 
                                margin: "0 0 16px 0", 
                                fontSize: "14px", 
                                color: "#555",
                                borderBottom: "1px solid #ddd",
                                paddingBottom: "4px"
                            }}>
                                World Constraints
                            </h4>

                            <div style={{ 
                                marginBottom: "16px", 
                                padding: "12px", 
                                backgroundColor: "#f8f9fa",
                                borderRadius: "4px",
                                border: "1px solid #e9ecef"
                            }}>
                                <div style={{ 
                                    fontSize: "12px", 
                                    fontWeight: "bold", 
                                    color: "#495057",
                                    marginBottom: "8px"
                                }}>
                                    Document Dimensions:
                                </div>
                                <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>
                                    Width: {worldDimensions.width.toLocaleString()}px
                                </div>
                                <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>
                                    Height: {worldDimensions.height.toLocaleString()}px
                                </div>
                                <div style={{ fontSize: "11px", color: "#666", marginTop: "8px" }}>
                                    Viewport: {window.innerWidth} × {window.innerHeight}px
                                </div>
                            </div>

                            <h4 style={{ 
                                margin: "0 0 16px 0", 
                                fontSize: "14px", 
                                color: "#555",
                                borderBottom: "1px solid #ddd",
                                paddingBottom: "4px"
                            }}>
                                Current Attract Path
                            </h4>

                            <div style={{ 
                                padding: "12px", 
                                backgroundColor: "#f8f9fa",
                                borderRadius: "4px",
                                border: "1px solid #e9ecef",
                                maxHeight: "200px",
                                overflowY: "auto"
                            }}>
                                <div style={{ 
                                    fontSize: "12px", 
                                    fontWeight: "bold", 
                                    color: "#495057",
                                    marginBottom: "8px"
                                }}>
                                    Path Points ({attractPath.length}):
                                </div>
                                {attractPath.length === 0 ? (
                                    <div style={{ fontSize: "11px", color: "#666", fontStyle: "italic" }}>
                                        No attract path detected
                                    </div>
                                ) : (
                                    attractPath.map((point, index) => (
                                        <div key={index} style={{ 
                                            fontSize: "10px", 
                                            color: "#666",
                                            fontFamily: "monospace",
                                            marginBottom: "2px"
                                        }}>
                                            [{index}] ({Math.round(point[0])}, {Math.round(point[1])})
                                        </div>
                                    ))
                                )}
                                
                                {attractPath.length > 0 && (
                                    <div style={{ 
                                        marginTop: "12px", 
                                        paddingTop: "8px", 
                                        borderTop: "1px solid #dee2e6" 
                                    }}>
                                        <div style={{ 
                                            fontSize: "11px", 
                                            color: "#495057", 
                                            fontWeight: "bold",
                                            marginBottom: "4px"
                                        }}>
                                            Path Stats:
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                                            Start: ({Math.round(attractPath[0][0])}, {Math.round(attractPath[0][1])})
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                                            End: ({Math.round(attractPath[attractPath.length - 1][0])}, {Math.round(attractPath[attractPath.length - 1][1])})
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666" }}>
                                            Length: {Math.round(Math.sqrt(
                                                Math.pow(attractPath[attractPath.length - 1][0] - attractPath[0][0], 2) + 
                                                Math.pow(attractPath[attractPath.length - 1][1] - attractPath[0][1], 2)
                                            ))}px
                                        </div>
                                    </div>
                                )}
                            </div>

                            <h4 style={{ 
                                margin: "16px 0 16px 0", 
                                fontSize: "14px", 
                                color: "#555",
                                borderBottom: "1px solid #ddd",
                                paddingBottom: "4px"
                            }}>
                                Particle[0] Details
                            </h4>

                            <div style={{ 
                                padding: "12px", 
                                backgroundColor: "#f8f9fa",
                                borderRadius: "4px",
                                border: "1px solid #e9ecef"
                            }}>
                                {boidDetails ? (
                                    <>
                                        <div style={{ 
                                            fontSize: "12px", 
                                            fontWeight: "bold", 
                                            color: "#495057",
                                            marginBottom: "8px"
                                        }}>
                                            Basic Info:
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                                            ID: {boidDetails.id}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                                            Landed: {boidDetails.landed ? "Yes" : "No"}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
                                            Max Speed: {boidDetails.maxSpeed?.toFixed(1)}
                                        </div>

                                        <div style={{ 
                                            fontSize: "12px", 
                                            fontWeight: "bold", 
                                            color: "#495057",
                                            marginBottom: "4px",
                                            paddingTop: "8px",
                                            borderTop: "1px solid #dee2e6"
                                        }}>
                                            Position:
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                                            X: {boidDetails.position.x.toFixed(1)}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
                                            Y: {boidDetails.position.y.toFixed(1)}
                                        </div>

                                        <div style={{ 
                                            fontSize: "12px", 
                                            fontWeight: "bold", 
                                            color: "#495057",
                                            marginBottom: "4px",
                                            paddingTop: "8px",
                                            borderTop: "1px solid #dee2e6"
                                        }}>
                                            Velocity:
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                                            X: {boidDetails.velocity.x.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                                            Y: {boidDetails.velocity.y.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
                                            Magnitude: {boidDetails.velocity.magnitude.toFixed(2)}
                                        </div>

                                        <div style={{ 
                                            fontSize: "12px", 
                                            fontWeight: "bold", 
                                            color: "#495057",
                                            marginBottom: "4px",
                                            paddingTop: "8px",
                                            borderTop: "1px solid #dee2e6"
                                        }}>
                                            Acceleration:
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                                            X: {boidDetails.acceleration.x.toFixed(4)}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                                            Y: {boidDetails.acceleration.y.toFixed(4)}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "8px" }}>
                                            Magnitude: {boidDetails.acceleration.magnitude.toFixed(4)}
                                        </div>

                                        <div style={{ 
                                            fontSize: "12px", 
                                            fontWeight: "bold", 
                                            color: "#495057",
                                            marginBottom: "4px",
                                            paddingTop: "8px",
                                            borderTop: "1px solid #dee2e6"
                                        }}>
                                            Behaviors:
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "4px" }}>
                                            Count: {boidDetails.behaviors.count}
                                        </div>
                                        {boidDetails.behaviors.names.map((name: string, index: number) => (
                                            <div key={index} style={{ 
                                                fontSize: "9px", 
                                                color: "#666",
                                                fontFamily: "monospace",
                                                marginBottom: "1px",
                                                paddingLeft: "8px"
                                            }}>
                                                [{index}] {name}
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div style={{ fontSize: "11px", color: "#666", fontStyle: "italic" }}>
                                        No boid data available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
