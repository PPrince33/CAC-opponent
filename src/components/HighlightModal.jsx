"use client";

import { useState } from "react";

export default function HighlightModal({
  tool, // 'shot' or 'pass'
  match, // match data for team names
  teamSheet = [],
  onSave,
  onCancel
}) {
  const [form, setForm] = useState({
    team_type: "focus_team",
    event_type: tool === "shot" ? "shot" : "key_pass",
    action_player_id: "",
    reaction_player_id: "",
    shot_outcome: "",
    goal_x: null, // Shot location in goal (0-100)
    goal_y: null  // Shot location in goal (0-100)
  });

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.team_type || !form.event_type) return;
    
    const payload = { ...form };
    if (form.event_type !== "shot") {
      payload.shot_outcome = null;
      payload.goal_x = null;
      payload.goal_y = null;
    }
    onSave(payload);
  };

  const handleGoalClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    update("goal_x", Math.round(x));
    update("goal_y", Math.round(y));
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="brutal-card animate-pop-in" style={{ padding: 0, minWidth: 450, maxWidth: 550 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: "#000", color: "#fff", padding: "10px 16px", fontWeight: 800, fontSize: "0.8rem" }}>
          LOG HIGHLIGHT EVENT
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>TEAM</label>
              <select className="brutal-select w-full" value={form.team_type} onChange={(e) => update("team_type", e.target.value)} required>
                <option value="focus_team">{match?.home_team?.toUpperCase() || "HOME TEAM"}</option>
                <option value="opponent">{match?.away_team?.toUpperCase() || "OPPONENT"}</option>
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
            <div style={{ borderTop: "2px solid #000", paddingTop: 12 }}>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 8, display: "block" }}>SHOT OUTCOME & GOAL TARGET</label>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {["goal", "target", "miss"].map(o => (
                    <button 
                      key={o} type="button" 
                      onClick={() => update("shot_outcome", o)}
                      className="brutal-btn"
                      style={{ 
                        fontSize: "0.6rem", padding: "6px",
                        background: form.shot_outcome === o ? "#000" : "#fff",
                        color: form.shot_outcome === o ? "#FACC15" : "#000"
                      }}
                    >
                      {o.toUpperCase()}
                    </button>
                  ))}
                </div>
                
                {/* Goal Post View */}
                <div 
                  onClick={handleGoalClick}
                  style={{ 
                    aspectRatio: "3/1", background: "#f0f0f0", border: "3px solid #000",
                    position: "relative", cursor: "crosshair", overflow: "hidden"
                  }}
                >
                   {/* Goal frame */}
                   <div style={{ position: "absolute", top: "10%", left: "5%", right: "5%", bottom: 0, border: "3px solid #666", borderBottom: "none" }}></div>
                   
                   {/* Grid lines for goal */}
                   <div style={{ position: "absolute", top: "40%", left: "5%", right: "5%", height: "2px", background: "rgba(0,0,0,0.1)" }}></div>
                   <div style={{ position: "absolute", top: "70%", left: "5%", right: "5%", height: "2px", background: "rgba(0,0,0,0.1)" }}></div>

                   {/* User selection dot */}
                   {form.goal_x !== null && (
                     <div style={{ 
                       position: "absolute", 
                       left: `${form.goal_x}%`, top: `${form.goal_y}%`,
                       width: 10, height: 10, background: "#EF4444", borderRadius: "50%",
                       transform: "translate(-50%, -50%)", border: "2px solid #000"
                     }}></div>
                   )}
                </div>
              </div>
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
