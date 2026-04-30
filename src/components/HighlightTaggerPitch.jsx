"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export default function HighlightTaggerPitch({
  title = "HIGHLIGHTS PITCH",
  events = [],
  onEventComplete,
  onEventClick,
  startPoint: externalStart,
  endPoint: externalEnd,
  onClear
}) {
  const containerRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [mousePoint, setMousePoint] = useState(null);

  // Sync with external state if needed (e.g. for clearing)
  useEffect(() => {
    if (!externalStart) {
      setStartPoint(null);
      setMousePoint(null);
      setIsDrawing(false);
    }
  }, [externalStart]);

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
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
      <div
        ref={containerRef}
        style={{ 
          cursor: "crosshair", position: "relative", background: "#f8fafc",
          aspectRatio: "3/2", borderBottom: "1px solid #e5e7eb"
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      >
        <svg
          viewBox="0 0 120 80"
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, padding: 10 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Pitch outline - Light Gray Style */}
          <rect x="0" y="0" width="120" height="80" fill="#fff" stroke="#94a3b8" strokeWidth="0.8" />
          <line x1="60" y1="0" x2="60" y2="80" stroke="#94a3b8" strokeWidth="0.8" />
          <circle cx="60" cy="40" r="9.15" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
          
          {/* Penalty areas */}
          <rect x="0" y="18" width="18" height="44" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
          <rect x="102" y="18" width="18" height="44" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
          <rect x="0" y="30" width="6" height="20" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
          <rect x="114" y="30" width="6" height="20" fill="none" stroke="#94a3b8" strokeWidth="0.8" />

          {/* Render historical events as subtle dots */}
          {events.map((ev, i) => {
            const color = ev.team_type === 'focus_team' ? "#22c55e" : "#ef4444";
            return (
              <circle 
                key={i} 
                cx={ev.start_x} cy={ev.start_y} r="1.2" 
                fill={color} fillOpacity="0.3"
                onClick={(e) => { e.stopPropagation(); onEventClick && onEventClick(ev); }}
                style={{ cursor: "pointer" }}
              />
            );
          })}

          {/* Render current active vector */}
          {(isDrawing || (externalStart && externalEnd)) && (
            <g>
              <line
                x1={isDrawing ? startPoint.x : externalStart.x} 
                y1={isDrawing ? startPoint.y : externalStart.y}
                x2={isDrawing ? mousePoint.x : externalEnd.x} 
                y2={isDrawing ? mousePoint.y : externalEnd.y}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle 
                cx={isDrawing ? startPoint.x : externalStart.x} 
                cy={isDrawing ? startPoint.y : externalStart.y} 
                r="1.5" fill="#ef4444" 
              />
              <circle 
                cx={isDrawing ? mousePoint.x : externalEnd.x} 
                cy={isDrawing ? mousePoint.y : externalEnd.y} 
                r="1.5" fill="#22c55e" 
              />
            </g>
          )}
        </svg>
      </div>
      
      <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.65rem", color: "#64748b" }}>
        <span>
          {isDrawing ? `Start: ${startPoint.x}, ${startPoint.y}` : 
           (externalStart && externalEnd) ? `Start: ${externalStart.x}, ${externalStart.y} | End: ${externalEnd.x}, ${externalEnd.y}` :
           "Click to set start point"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClear} style={{ color: "#ef4444", fontWeight: 700, border: "1px solid #fee2e2", padding: "2px 8px", borderRadius: 4, background: "#fef2f2" }}>Clear Pitch</button>
        </div>
      </div>
    </div>
  );
}
