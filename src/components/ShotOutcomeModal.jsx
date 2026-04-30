"use client";

export default function ShotOutcomeModal({ onSelect, onCancel, position }) {
  const outcomes = [
    { value: "miss", symbol: "•", label: "OFF TARGET / BLOCKED", color: "#F87171", bg: "#FEE2E2" },
    { value: "target", symbol: "✦", label: "ON TARGET", color: "#D97706", bg: "#FEF3C7" },
    { value: "goal", symbol: "⚽", label: "GOAL", color: "#059669", bg: "#D1FAE5" },
  ];

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="brutal-card animate-pop-in" style={{ padding: 0, minWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: "#000", color: "#fff", padding: "10px 16px", fontWeight: 800, fontSize: "0.8rem", borderBottom: "3px solid #000" }}>
          SHOT OUTCOME
          {position && <span style={{ float: "right", color: "#34D399" }}>({position.x}, {position.y})</span>}
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {outcomes.map((o) => (
            <button key={o.value} onClick={() => onSelect(o.value)} className="brutal-btn" style={{ background: o.bg, color: o.color, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", width: "100%", justifyContent: "flex-start" }}>
              <span style={{ fontSize: "1.4rem" }}>{o.symbol}</span>
              <span>{o.label}</span>
            </button>
          ))}
          <button onClick={onCancel} className="brutal-btn" style={{ background: "#E5E7EB", color: "#000", fontSize: "0.75rem", marginTop: 4 }}>✕ CANCEL</button>
        </div>
      </div>
    </div>
  );
}
