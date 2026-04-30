"use client";

import { useState } from "react";

export default function MatchModal({ initialData, onSave, onCancel }) {
  const isEdit = !!initialData;
  const [form, setForm] = useState(
    initialData || { home_team: "", away_team: "", match_date: "", score_home: 0, score_away: 0, video_link: "" }
  );

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const updateUpper = (key, val) => setForm((f) => ({ ...f, [key]: val.toUpperCase() }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.home_team || !form.away_team) return;
    onSave(form);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="brutal-card animate-pop-in" style={{ padding: 0, minWidth: 400, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: "#000", color: "#fff", padding: "10px 16px", fontWeight: 800, fontSize: "0.8rem" }}>
          {isEdit ? "EDIT MATCH" : "CREATE NEW MATCH"}
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>HOME TEAM</label>
              <input className="brutal-input" style={{ width: "100%", textTransform: "uppercase" }} value={form.home_team} onChange={(e) => updateUpper("home_team", e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>AWAY TEAM</label>
              <input className="brutal-input" style={{ width: "100%", textTransform: "uppercase" }} value={form.away_team} onChange={(e) => updateUpper("away_team", e.target.value)} required />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>DATE</label>
              <input className="brutal-input" style={{ width: "100%" }} type="date" value={form.match_date || ""} onChange={(e) => update("match_date", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>HOME SCORE</label>
              <input className="brutal-input" style={{ width: "100%" }} type="number" min="0" value={form.score_home} onChange={(e) => update("score_home", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>AWAY SCORE</label>
              <input className="brutal-input" style={{ width: "100%" }} type="number" min="0" value={form.score_away} onChange={(e) => update("score_away", parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: 4, display: "block" }}>VIDEO LINK (YOUTUBE / MP4)</label>
            <input className="brutal-input" style={{ width: "100%" }} value={form.video_link || ""} onChange={(e) => update("video_link", e.target.value)} placeholder="https://..." />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" className="brutal-btn" style={{ background: "#34D399", color: "#000", flex: 1 }}>
              {isEdit ? "✓ SAVE CHANGES" : "✓ CREATE"}
            </button>
            <button type="button" onClick={onCancel} className="brutal-btn" style={{ background: "#E5E7EB", color: "#000" }}>✕ CANCEL</button>
          </div>
        </form>
      </div>
    </div>
  );
}
