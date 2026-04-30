"use client";

import { useState } from "react";

export default function HighlightModal({
  tool, // 'shot' or 'pass'
  teamSheet = [],
  onSave,
  onCancel
}) {
  const [form, setForm] = useState({
    team_type: "focus_team",
    event_type: tool === "shot" ? "shot" : "key_pass",
    action_player_id: "",
    reaction_player_id: "",
    shot_outcome: ""
  });

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.team_type || !form.event_type) return;
    
    // Clean up
    const payload = { ...form };
    if (form.event_type !== "shot") {
      payload.shot_outcome = null;
    }
    onSave(payload);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="brutal-card animate-pop-in" style={{ padding: 0, minWidth: 400, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: "#000", color: "#fff", padding: "10px 16px", fontWeight: 800, fontSize: "0.8rem" }}>
          LOG HIGHLIGHT EVENT
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>TEAM</label>
              <select className="brutal-select w-full" value={form.team_type} onChange={(e) => update("team_type", e.target.value)} required>
                <option value="focus_team">FOCUS TEAM</option>
                <option value="opponent">OPPONENT</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>EVENT TYPE</label>
              <select className="brutal-select w-full" value={form.event_type} onChange={(e) => update("event_type", e.target.value)} required>
                {tool === "shot" ? (
                  <option value="shot">SHOT</option>
                ) : (
                  <>
                    <option value="key_pass">KEY PASS</option>
                    <option value="assist">ASSIST</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>ACTION PLAYER</label>
              <select className="brutal-select w-full" value={form.action_player_id} onChange={(e) => update("action_player_id", e.target.value)}>
                <option value="">— SELECT —</option>
                {teamSheet.map(p => (
                  <option key={p.id} value={p.id}>{p.jersey_number} {p.player_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>REACTION PLAYER</label>
              <select className="brutal-select w-full" value={form.reaction_player_id} onChange={(e) => update("reaction_player_id", e.target.value)}>
                <option value="">— SELECT (OPTIONAL) —</option>
                {teamSheet.map(p => (
                  <option key={p.id} value={p.id}>{p.jersey_number} {p.player_name}</option>
                ))}
              </select>
            </div>
          </div>

          {form.event_type === "shot" && (
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>SHOT OUTCOME</label>
              <select className="brutal-select w-full" value={form.shot_outcome} onChange={(e) => update("shot_outcome", e.target.value)} required={form.event_type === "shot"}>
                <option value="">— SELECT OUTCOME —</option>
                <option value="goal">⚽ GOAL</option>
                <option value="target">✦ ON TARGET</option>
                <option value="miss">• MISS</option>
              </select>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" className="brutal-btn" style={{ background: "#34D399", color: "#000", flex: 1 }}>✓ SAVE EVENT</button>
            <button type="button" onClick={onCancel} className="brutal-btn" style={{ background: "#E5E7EB", color: "#000" }}>✕ CANCEL</button>
          </div>
        </form>
      </div>
    </div>
  );
}
