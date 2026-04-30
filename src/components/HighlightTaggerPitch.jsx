"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export default function HighlightTaggerPitch({
  title = "HIGHLIGHTS PITCH",
  events = [],
  tool = "shot", // 'shot' | 'pass'
  onEventComplete,
  onEventClick,
}) {
  const containerRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [mousePoint, setMousePoint] = useState(null);

  // If tool changes, reset drawing state
  useEffect(() => {
    setIsDrawing(false);
    setStartPoint(null);
    setMousePoint(null);
  }, [tool]);

  const getCoords = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.round(relX * 120 * 10) / 10,
      y: Math.round(relY * 80 * 10) / 10,
    };
  };

  const handleClick = useCallback(
    (e) => {
      if (!onEventComplete) return;
      const { x, y } = getCoords(e);

      if (!isDrawing) {
        setStartPoint({ x, y });
        setMousePoint({ x, y });
        setIsDrawing(true);
      } else {
        onEventComplete(startPoint.x, startPoint.y, x, y);
        setIsDrawing(false);
        setStartPoint(null);
        setMousePoint(null);
      }
    },
    [onEventComplete, tool, isDrawing, startPoint]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawing || tool !== "pass") return;
      setMousePoint(getCoords(e));
    },
    [isDrawing, tool]
  );

  return (
    <div>
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "4px 8px",
          fontWeight: 800,
          fontSize: "0.65rem",
          borderBottom: "none",
          border: "3px solid #000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{title}</span>
        <span style={{ color: "#FACC15", fontSize: "0.55rem" }}>
          {tool === "shot" ? "LOG SHOT" : isDrawing ? "SET END" : "SET START"}
        </span>
      </div>

      <div
        ref={containerRef}
        className="pitch-container"
        style={{ cursor: "crosshair", position: "relative" }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      >
        <svg
          viewBox="0 0 120 80"
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Pitch outline */}
          <rect x="0" y="0" width="120" height="80" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <line x1="60" y1="0" x2="60" y2="80" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <circle cx="60" cy="40" r="9.15" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <circle cx="60" cy="40" r="0.5" fill="rgba(255,255,255,0.7)" />

          {/* Left penalty area */}
          <rect x="0" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <rect x="0" y="30" width="6" height="20" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <circle cx="12" cy="40" r="0.5" fill="rgba(255,255,255,0.7)" />
          <path d="M 18 33.5 A 9.15 9.15 0 0 1 18 46.5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />

          {/* Right penalty area */}
          <rect x="102" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <rect x="114" y="30" width="6" height="20" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <circle cx="108" cy="40" r="0.5" fill="rgba(255,255,255,0.7)" />
          <path d="M 102 33.5 A 9.15 9.15 0 0 0 102 46.5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />

          {/* Render already logged events (optional preview) */}
          {events.map((ev, i) => {
            const isPass = ev.event_type !== 'shot' && ev.end_x != null && ev.end_y != null;
            const color = ev.team_type === 'focus_team' ? "#34D399" : "#F87171";
            return (
              <g 
                key={i} 
                onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(ev); }}
                style={{ cursor: "pointer" }}
              >
                <circle cx={ev.start_x} cy={ev.start_y} r="1.2" fill={color} stroke="#000" strokeWidth="0.3" />
                {isPass && (
                  <>
                    <line x1={ev.start_x} y1={ev.start_y} x2={ev.end_x} y2={ev.end_y} stroke={color} strokeWidth="0.6" strokeDasharray="1,1" />
                    <circle cx={ev.end_x} cy={ev.end_y} r="0.6" fill={color} />
                  </>
                )}
              </g>
            );
          })}

          {/* Render drawing preview line */}
          {isDrawing && startPoint && mousePoint && (
            <g>
              <line
                x1={startPoint.x} y1={startPoint.y}
                x2={mousePoint.x} y2={mousePoint.y}
                stroke="#FACC15"
                strokeWidth="0.5"
                strokeDasharray="1,1"
              />
              <circle cx={startPoint.x} cy={startPoint.y} r="0.8" fill="#FACC15" />
              <circle cx={mousePoint.x} cy={mousePoint.y} r="0.8" fill="#FACC15" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
