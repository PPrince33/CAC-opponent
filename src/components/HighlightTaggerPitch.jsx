"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export default function HighlightTaggerPitch({
  title = "HIGHLIGHTS PITCH",
  events = [],
  onEventComplete,
  onEventClick,
}) {
  const containerRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [mousePoint, setMousePoint] = useState(null);

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
    [onEventComplete, isDrawing, startPoint]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawing) return;
      setMousePoint(getCoords(e));
    },
    [isDrawing]
  );

  return (
    <div className="brutal-card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "4px 8px",
          fontWeight: 800,
          fontSize: "0.65rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{title}</span>
        <span style={{ color: "#FACC15", fontSize: "0.55rem" }}>
          {isDrawing ? "CLICK END LOCATION" : "CLICK START LOCATION"}
        </span>
      </div>

      <div
        ref={containerRef}
        style={{ 
          cursor: "crosshair", position: "relative", background: "#2D5A27",
          aspectRatio: "3/2"
        }}
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

          {/* Penalty areas */}
          <rect x="0" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <rect x="102" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />

          {/* Render logged events */}
          {events.map((ev, i) => {
            const isPass = ev.event_type !== 'shot' && ev.end_x != null && ev.end_y != null;
            const color = ev.team_type === 'focus_team' ? "#34D399" : "#F87171";
            return (
              <g 
                key={i} 
                onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(ev); }}
                style={{ cursor: "pointer" }}
              >
                <circle cx={ev.start_x} cy={ev.start_y} r="1.4" fill={color} stroke="#000" strokeWidth="0.4" />
                {ev.end_x != null && ev.end_y != null && (
                  <>
                    <line x1={ev.start_x} y1={ev.start_y} x2={ev.end_x} y2={ev.end_y} stroke={color} strokeWidth="0.8" strokeDasharray="1,1" />
                    <circle cx={ev.end_x} cy={ev.end_y} r="0.6" fill={color} />
                  </>
                )}
              </g>
            );
          })}

          {/* Preview line */}
          {isDrawing && startPoint && mousePoint && (
            <g>
              <line
                x1={startPoint.x} y1={startPoint.y}
                x2={mousePoint.x} y2={mousePoint.y}
                stroke="#FACC15"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle cx={startPoint.x} cy={startPoint.y} r="1" fill="#FACC15" stroke="#000" strokeWidth="0.2" />
              <circle cx={mousePoint.x} cy={mousePoint.y} r="0.8" fill="#FACC15" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
