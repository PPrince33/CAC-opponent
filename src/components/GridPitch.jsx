"use client";

import { useState, useMemo } from "react";
import PitchSVG from "./PitchSVG";

/**
 * GridPitch — 12×8 zone grid overlaying a football pitch.
 * Used for Gain Ball and Lose Ball tagging.
 *
 * Props:
 *   title        - Label above the pitch
 *   events       - Array of { zone_col, zone_row } objects
 *   onZoneClick  - (col, row) => void
 *   colorScheme  - 'teal' | 'orange' | 'blue' | 'red'
 *   mode         - 'tagger' (click to add) | 'heatmap' (display only)
 */
export default function GridPitch({
  title = "PITCH",
  events = [],
  onZoneClick,
  colorScheme = "teal",
  mode = "tagger",
}) {
  const [flashCell, setFlashCell] = useState(null);

  const COLS = 12;
  const ROWS = 8;

  // Count events per zone
  const zoneCounts = useMemo(() => {
    const counts = {};
    events.forEach((e) => {
      const key = `${e.zone_col}-${e.zone_row}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [events]);

  // Max count for heatmap scaling
  const maxCount = useMemo(() => {
    const vals = Object.values(zoneCounts);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [zoneCounts]);

  const colorMap = {
    teal: { base: "45, 212, 191", accent: "#2DD4BF" },
    orange: { base: "251, 146, 60", accent: "#FB923C" },
    blue: { base: "96, 165, 250", accent: "#60A5FA" },
    red: { base: "248, 113, 113", accent: "#F87171" },
  };

  const colors = colorMap[colorScheme] || colorMap.teal;

  const handleClick = (col, row) => {
    if (!onZoneClick || mode !== "tagger") return;
    setFlashCell(`${col}-${row}`);
    setTimeout(() => setFlashCell(null), 400);
    onZoneClick(col, row);
  };

  const getCellOpacity = (count) => {
    if (count === 0) return 0;
    // Scale from 0.15 to 0.9
    return 0.15 + (count / maxCount) * 0.75;
  };

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
        <span
          className="brutal-badge"
          style={{
            background: colors.accent,
            color: "#000",
            fontSize: "0.65rem",
          }}
        >
          {events.length} EVENTS
        </span>
      </div>

      {/* Pitch with grid */}
      <div className="pitch-container" style={{ borderTop: "none" }}>
        <PitchSVG />

        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const zoneCol = col + 1;
              const zoneRow = row + 1;
              const key = `${zoneCol}-${zoneRow}`;
              const count = zoneCounts[key] || 0;
              const isFlashing = flashCell === key;

              return (
                <div
                  key={key}
                  onClick={() => handleClick(zoneCol, zoneRow)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    cursor: mode === "tagger" ? "crosshair" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.2s ease",
                    background: isFlashing
                      ? colors.accent
                      : count > 0
                      ? `rgba(${colors.base}, ${getCellOpacity(count)})`
                      : "transparent",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (mode === "tagger") {
                      e.target.style.background = `rgba(${colors.base}, 0.3)`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFlashing) {
                      e.target.style.background =
                        count > 0
                          ? `rgba(${colors.base}, ${getCellOpacity(count)})`
                          : "transparent";
                    }
                  }}
                >
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 800,
                        color: "#fff",
                        textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                        pointerEvents: "none",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
