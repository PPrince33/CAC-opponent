"use client";

export default function EventLog({ events, onDelete }) {
  if (!events || events.length === 0) {
    return (
      <div className="brutal-card" style={{ padding: 16, textAlign: "center", color: "#999", fontSize: "0.75rem" }}>
        NO EVENTS LOGGED YET — CLICK A PITCH TO START
      </div>
    );
  }

  const typeColors = {
    gain_ball: { bg: "#D1FAE5", color: "#065F46" },
    lose_ball: { bg: "#FEE2E2", color: "#991B1B" },
    shot_taken: { bg: "#DBEAFE", color: "#1E40AF" },
    shot_conceded: { bg: "#FEF3C7", color: "#92400E" },
  };

  const outcomeIcons = { miss: "•", target: "✦", goal: "⚽" };

  return (
    <div className="brutal-card" style={{ overflow: "hidden" }}>
      <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem", display: "flex", justifyContent: "space-between" }}>
        <span>EVENT LOG</span>
        <span className="brutal-badge" style={{ background: "#34D399", color: "#000", fontSize: "0.6rem" }}>{events.length} EVENTS</span>
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
          <thead>
            <tr style={{ background: "#F3F4F6", borderBottom: "2px solid #000" }}>
              <th style={{ padding: "6px 8px", textAlign: "left" }}>TIME</th>
              <th style={{ padding: "6px 8px", textAlign: "left" }}>HALF</th>
              <th style={{ padding: "6px 8px", textAlign: "left" }}>TYPE</th>
              <th style={{ padding: "6px 8px", textAlign: "left" }}>LOCATION</th>
              <th style={{ padding: "6px 8px", textAlign: "left" }}>OUTCOME</th>
              <th style={{ padding: "6px 8px", textAlign: "center" }}>DEL</th>
            </tr>
          </thead>
          <tbody>
            {events.slice().reverse().map((ev, i) => {
              const tc = typeColors[ev.event_type] || { bg: "#fff", color: "#000" };
              return (
                <tr key={ev.id || i} className="animate-slide-up" style={{ borderBottom: "1px solid #E5E7EB" }}>
                  <td style={{ padding: "6px 8px", fontWeight: 600 }}>{ev.timestamp || "—"}</td>
                  <td style={{ padding: "6px 8px" }}>{ev.half || "—"}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <span className="brutal-badge" style={{ background: tc.bg, color: tc.color }}>{ev.event_type?.replace("_", " ")}</span>
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    {ev.zone_col ? `Z${ev.zone_col},${ev.zone_row}` : ev.location_x != null ? `(${ev.location_x}, ${ev.location_y})` : "—"}
                  </td>
                  <td style={{ padding: "6px 8px", fontSize: "0.9rem" }}>{ev.shot_outcome ? outcomeIcons[ev.shot_outcome] || ev.shot_outcome : "—"}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>
                    <button onClick={() => onDelete && onDelete(ev.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#EF4444" }}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
