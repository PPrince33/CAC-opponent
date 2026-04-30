"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TeamSheetManager({ matchId }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    team_name: "",
    player_name: "",
    jersey_number: "",
    position: ""
  });

  useEffect(() => {
    if (!matchId) return;
    loadPlayers();
  }, [matchId]);

  const loadPlayers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("team_sheets")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    setPlayers(data || []);
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!matchId || !form.team_name || !form.player_name) return;
    
    const { data, error } = await supabase
      .from("team_sheets")
      .insert([{ ...form, match_id: matchId }])
      .select()
      .single();
      
    if (!error && data) {
      setPlayers((prev) => [...prev, data]);
      setForm((prev) => ({ ...prev, player_name: "", jersey_number: "", position: "" })); // Keep team_name same for rapid entry
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("team_sheets").delete().eq("id", id);
    if (!error) {
      setPlayers((prev) => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="brutal-card" style={{ padding: 12 }}>
      <div style={{ background: "#000", color: "#fff", padding: "6px 12px", fontWeight: 800, fontSize: "0.75rem", marginBottom: 12 }}>
        📋 TEAM SHEET
      </div>
      
      {/* ADD PLAYER FORM */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input 
          className="brutal-input" style={{ flex: 1, minWidth: 120 }} placeholder="Team Name" 
          value={form.team_name} onChange={(e) => setForm({...form, team_name: e.target.value})} required 
        />
        <input 
          className="brutal-input" style={{ width: 60 }} placeholder="#" 
          value={form.jersey_number} onChange={(e) => setForm({...form, jersey_number: e.target.value})} 
        />
        <input 
          className="brutal-input" style={{ flex: 2, minWidth: 150 }} placeholder="Player Name" 
          value={form.player_name} onChange={(e) => setForm({...form, player_name: e.target.value})} required 
        />
        <input 
          className="brutal-input" style={{ flex: 1, minWidth: 100 }} placeholder="Pos" 
          value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} 
        />
        <button type="submit" className="brutal-btn" style={{ background: "#2DD4BF" }}>+ ADD</button>
      </form>

      {/* PLAYER LIST */}
      <div style={{ maxHeight: 250, overflowY: "auto", border: "2px solid #000" }}>
        {players.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", fontSize: "0.8rem", color: "#666" }}>NO PLAYERS ADDED</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead style={{ background: "#f0f0f0", borderBottom: "2px solid #000" }}>
              <tr>
                <th style={{ padding: 6, textAlign: "left" }}>TEAM</th>
                <th style={{ padding: 6, textAlign: "left" }}>#</th>
                <th style={{ padding: 6, textAlign: "left" }}>NAME</th>
                <th style={{ padding: 6, textAlign: "left" }}>POS</th>
                <th style={{ padding: 6 }}></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "6px 8px" }}>{p.team_name}</td>
                  <td style={{ padding: "6px 8px" }}>{p.jersey_number}</td>
                  <td style={{ padding: "6px 8px", fontWeight: 600 }}>{p.player_name}</td>
                  <td style={{ padding: "6px 8px" }}>{p.position}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>
                    <button onClick={() => handleDelete(p.id)} style={{ color: "red", fontWeight: 800 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
