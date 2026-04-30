"use client";

import { useRef, useCallback } from "react";
import PitchSVG from "./PitchSVG";

/**
 * CoordinatePitch — Exact X,Y coordinate tracking on a football pitch.
 * Used for Shots Taken / Shots Conceded tagging and shot map display.
 *
 * Props:
 *   title        - Label above the pitch
 *   events       - Array of { location_x, location_y, shot_outcome }
 *   onPitchClick - (x, y) => void  — coordinates in 0–120, 0–80
 *   zoomToBox    - 'left' | 'right' | null — crops to penalty box area for dashboard
 *   mode         - 'tagger' | 'display'
 */
export default function CoordinatePitch({
  title = "SHOTS",
  events = [],
  onPitchClick,
  zoomToBox = null,
  mode = "tagger",
}) {
  const containerRef = useRef(null);

  const handleClick = useCallback(
    (e) => {
      if (!onPitchClick || mode !== "tagger") return;
      const rect = containerRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      let x, y;
      if (zoomToBox === "left") {
        x = relX * 30; // 0–30
        y = relY * 80;
      } else if (zoomToBox === "right") {
        x = 90 + relX * 30; // 90–120
        y = relY * 80;
      } else {
        x = relX * 120;
        y = relY * 80;
      }

      onPitchClick(
        Math.round(x * 10) / 10,
        Math.round(y * 10) / 10
      );
    },
    [onPitchClick, mode, zoomToBox]
  );

  // Convert coordinates to percentage positions
  const getPosition = (locX, locY) => {
    let pctX, pctY;
    if (zoomToBox === "left") {
      pctX = (locX / 30) * 100;
      pctY = (locY / 80) * 100;
    } else if (zoomToBox === "right") {
      pctX = ((locX - 90) / 30) * 100;
      pctY = (locY / 80) * 100;
    } else {
      pctX = (locX / 120) * 100;
      pctY = (locY / 80) * 100;
    }
    return { left: `${pctX}%`, top: `${pctY}%` };
  };

  // Shot outcome to marker
  const getMarker = (outcome) => {
    switch (outcome) {
      case "goal":
        return { symbol: "⚽", color: "#34D399", size: "1rem" };
      case "target":
        return { symbol: "✦", color: "#FACC15", size: "0.9rem" };
      case "miss":
      default:
        return { symbol: "•", color: "#F87171", size: "1.1rem" };
    }
  };

  // Filter events visible in zoom
  const visibleEvents = events.filter((e) => {
    if (!zoomToBox) return true;
    if (zoomToBox === "left") return e.location_x <= 30;
    if (zoomToBox === "right") return e.location_x >= 90;
    return true;
  });

  // SVG viewBox for zoomed views
  const svgViewBox = zoomToBox === "left"
    ? "0 0 30 80"
    : zoomToBox === "right"
    ? "90 0 30 80"
    : "0 0 120 80";

  return (
    <div>
      {/* Title */}
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "6px 12px",
          fontWeight: 800,
          fontSize: "0.75rem",
          borderBottom: "none",
          border: "3px solid #000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{title}</span>
        <div className="flex gap-2 items-center">
          {/* Legend */}
          <span style={{ fontSize: "0.6rem", color: "#F87171" }}>• MISS</span>
          <span style={{ fontSize: "0.6rem", color: "#FACC15" }}>✦ ON TARGET</span>
          <span style={{ fontSize: "0.6rem", color: "#34D399" }}>⚽ GOAL</span>
          <span
            className="brutal-badge"
            style={{
              background: "var(--color-badge-blue)",
              color: "#000",
              fontSize: "0.65rem",
              marginLeft: 4,
            }}
          >
            {visibleEvents.length}
          </span>
        </div>
      </div>

      {/* Pitch */}
      <div
        ref={containerRef}
        className="pitch-container"
        style={{
          borderTop: "none",
          cursor: mode === "tagger" ? "crosshair" : "default",
        }}
        onClick={handleClick}
      >
        {/* SVG pitch with optional zoom */}
        <svg
          viewBox={svgViewBox}
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Pitch outline */}
          <rect
            x="0" y="0" width="120" height="80"
            fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5"
          />
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

          {/* Corner arcs */}
          <path d="M 0 2 A 2 2 0 0 0 2 0" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <path d="M 118 0 A 2 2 0 0 0 120 2" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <path d="M 0 78 A 2 2 0 0 1 2 80" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
          <path d="M 118 80 A 2 2 0 0 1 120 78" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />

          {/* Goals */}
          <rect x="-2" y="36" width="2" height="8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.35" />
          <rect x="120" y="36" width="2" height="8" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.35" />
        </svg>

        {/* Shot markers */}
        {visibleEvents.map((event, i) => {
          const pos = getPosition(event.location_x, event.location_y);
          const marker = getMarker(event.shot_outcome);
          return (
            <div
              key={event.id || i}
              className="animate-pop-in"
              style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                transform: "translate(-50%, -50%)",
                fontSize: marker.size,
                color: marker.color,
                textShadow: "0 0 4px rgba(0,0,0,0.8)",
                pointerEvents: "none",
                zIndex: 10,
                filter: "drop-shadow(0 0 3px rgba(0,0,0,0.5))",
              }}
            >
              {marker.symbol}
            </div>
          );
        })}
      </div>
    </div>
  );
}
