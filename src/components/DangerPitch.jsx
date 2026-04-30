"use client";

import { useRef, useMemo } from "react";

export default function DangerPitch({ 
  events = [], 
  onEventClick,
  homeTeamName = "Focus Team",
  awayTeamName = "Opponent"
}) {
  const containerRef = useRef(null);

  // Divide events into Conceded (Focus goal under threat) and Created (Opponent goal under threat)
  // Assuming Focus Team always attacks Left-to-Right (L2R) for normalization in this view
  const concededEvents = useMemo(() => events.filter(e => e.team_type === 'opponent'), [events]);
  const createdEvents = useMemo(() => events.filter(e => e.team_type === 'focus_team'), [events]);

  const renderPitchContent = () => (
    <svg viewBox="0 0 120 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* Pitch outline */}
      <rect x="0" y="0" width="120" height="80" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
      
      {/* Center Line & Circle */}
      <line x1="60" y1="0" x2="60" y2="80" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
      <circle cx="60" cy="40" r="9.15" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
      <circle cx="60" cy="40" r="0.4" fill="rgba(255,255,255,0.8)" />

      {/* Left Side (Conceded Zone for Focus Team) */}
      <rect x="0" y="19.85" width="16.5" height="40.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
      <rect x="0" y="30.85" width="5.5" height="18.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
      <circle cx="11" cy="40" r="0.4" fill="rgba(255,255,255,0.8)" />
      <path d="M 16.5 32.7 A 9.15 9.15 0 0 1 16.5 47.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />

      {/* Right Side (Created Zone for Focus Team) */}
      <rect x="103.5" y="19.85" width="16.5" height="40.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
      <rect x="114.5" y="30.85" width="5.5" height="18.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
      <circle cx="109" cy="40" r="0.4" fill="rgba(255,255,255,0.8)" />
      <path d="M 103.5 32.7 A 9.15 9.15 0 0 0 103.5 47.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />

      {/* Events */}
      {events.map((ev, i) => {
        const color = ev.team_type === 'focus_team' ? "#34D399" : "#F87171";
        const isPass = ev.event_type !== 'shot';
        return (
          <g key={i} onClick={() => onEventClick && onEventClick(ev)} style={{ cursor: "pointer" }}>
            <circle cx={ev.start_x} cy={ev.start_y} r="1.4" fill={color} stroke="#000" strokeWidth="0.3" fillOpacity="0.8" />
            {isPass && ev.end_x != null && (
              <line x1={ev.start_x} y1={ev.start_y} x2={ev.end_x} y2={ev.end_y} stroke={color} strokeWidth="0.6" strokeDasharray="1,1" strokeOpacity="0.6" />
            )}
          </g>
        );
      })}
    </svg>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="brutal-card" style={{ background: "#111" }}>
          <div style={{ background: "#F87171", color: "#000", padding: "6px 12px", fontWeight: 900, fontSize: "0.75rem", borderBottom: "3px solid #000" }}>
            DANGER CONCEDED ({concededEvents.length})
          </div>
          <div style={{ padding: 12, aspectRatio: "3/2" }}>
            {renderPitchContent()}
          </div>
        </div>
        <div className="brutal-card" style={{ background: "#111" }}>
          <div style={{ background: "#34D399", color: "#000", padding: "6px 12px", fontWeight: 900, fontSize: "0.75rem", borderBottom: "3px solid #000" }}>
            DANGER CREATED ({createdEvents.length})
          </div>
          <div style={{ padding: 12, aspectRatio: "3/2" }}>
            {renderPitchContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
