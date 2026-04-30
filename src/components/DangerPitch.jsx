"use client";

import { useState } from "react";

export default function DangerPitch({
  title = "DANGER MAP",
  events = [],
  teamSheet = [],
}) {
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getPlayerName = (id) => {
    if (!id) return "Unknown";
    const p = teamSheet.find(ts => ts.id === id);
    return p ? `${p.jersey_number} ${p.player_name}` : "Unknown";
  };

  const handleMouseMove = (e, ev) => {
    setHoveredEvent(ev);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredEvent(null);
  };

  return (
    <div>
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: "6px 12px",
          fontWeight: 800,
          fontSize: "0.75rem",
          border: "3px solid #000",
          borderBottom: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{title}</span>
        <div style={{ display: "flex", gap: 12, fontSize: "0.6rem" }}>
          <span style={{ color: "#34D399" }}>⚽ GOAL</span>
          <span style={{ color: "#FACC15" }}>✦ SHOT TARGET</span>
          <span style={{ color: "#F87171" }}>• SHOT MISS</span>
          <span style={{ color: "#60A5FA" }}>↗ KEY PASS</span>
          <span style={{ color: "#A855F7" }}>↗ ASSIST</span>
        </div>
      </div>

      <div
        style={{
          border: "3px solid #000",
          position: "relative",
          background: "#2D5A27", // Neo-brutalist dark green pitch
          aspectRatio: "3/2",
          overflow: "hidden"
        }}
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

          {/* EVENTS */}
          {events.map((ev) => {
            const isPass = ev.event_type !== "shot";
            let color = "#fff";
            
            if (ev.event_type === "shot") {
              if (ev.shot_outcome === "goal") color = "#34D399";
              else if (ev.shot_outcome === "target") color = "#FACC15";
              else color = "#F87171";
            } else if (ev.event_type === "key_pass") {
              color = "#60A5FA";
            } else if (ev.event_type === "assist") {
              color = "#A855F7";
            }

            return (
              <g
                key={ev.id}
                onMouseEnter={(e) => handleMouseMove(e, ev)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={(e) => handleMouseMove(e, ev)}
                style={{ cursor: "pointer" }}
              >
                <circle cx={ev.start_x} cy={ev.start_y} r="1.2" fill={color} stroke="#000" strokeWidth="0.3" />
                {isPass && ev.end_x != null && ev.end_y != null && (
                  <>
                    <line 
                      x1={ev.start_x} y1={ev.start_y} 
                      x2={ev.end_x} y2={ev.end_y} 
                      stroke={color} strokeWidth="0.6" strokeDasharray="1,1" 
                    />
                    {/* Arrow head */}
                    <circle cx={ev.end_x} cy={ev.end_y} r="0.6" fill={color} />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {hoveredEvent && (
          <div
            style={{
              position: "fixed",
              top: mousePos.y + 15,
              left: mousePos.x + 15,
              background: "#000",
              color: "#fff",
              padding: "8px 12px",
              border: "2px solid #fff",
              fontSize: "0.75rem",
              fontWeight: 700,
              zIndex: 100,
              pointerEvents: "none",
              boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
              minWidth: 150
            }}
          >
            <div style={{ color: "#FACC15", marginBottom: 4, textTransform: "uppercase" }}>
              {hoveredEvent.event_type.replace('_', ' ')}
            </div>
            <div>{getPlayerName(hoveredEvent.action_player_id)}</div>
            {hoveredEvent.reaction_player_id && (
              <div style={{ color: "#aaa" }}>→ {getPlayerName(hoveredEvent.reaction_player_id)}</div>
            )}
            <div style={{ fontSize: "0.65rem", marginTop: 4, color: "#666" }}>
              {hoveredEvent.timestamp || "00:00"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
