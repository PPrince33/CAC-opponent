"use client";

export default function FilterBar({ teams, selectedTeam, onTeamChange, matches, selectedMatches, onMatchToggle }) {
  return (
    <div style={{ background: "#FACC15", border: "3px solid #000", borderTop: "none", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>NEXT OPPONENT:</label>
        <select className="brutal-select" value={selectedTeam} onChange={(e) => onTeamChange(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">— SELECT TEAM —</option>
          {teams.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
      </div>
      {selectedTeam && matches && matches.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>MATCHES:</label>
          {matches.map((m) => {
            const isSelected = selectedMatches.includes(m.id);
            return (
              <button key={m.id} onClick={() => onMatchToggle(m.id)} className="brutal-btn" style={{ background: isSelected ? "#000" : "#fff", color: isSelected ? "#FACC15" : "#000", fontSize: "0.65rem", padding: "4px 10px" }}>
                {m.home_team} VS {m.away_team} ({m.score_home}-{m.score_away})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
