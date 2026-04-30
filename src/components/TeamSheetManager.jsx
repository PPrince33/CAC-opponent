"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TeamSheetManager({ matchId, onPlayerChange }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("single"); // "single" | "bulk"
  const [bulkText, setBulkText] = useState("");
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
      setForm((prev) => ({ ...prev, player_name: "", jersey_number: "", position: "" }));
      onPlayerChange && onPlayerChange(); // notify parent
    }
  };

  const handleBulkAdd = async () => {
    if (!matchId || !bulkText) return;
    
    const lines = bulkText.split("\n").filter(l => l.trim());
    const newPlayers = lines.map(line => {
      // Try to parse CSV or Tab separated, or space separated
      let parts = [];
      if (line.includes(",")) parts = line.split(",").map(p => p.trim());
      else if (line.includes("\t")) parts = line.split("\t").map(p => p.trim());
      else parts = line.split(/\s+/).map(p => p.trim());

      let team = form.team_name;
      let jersey = "";
      let name = "";
      let pos = "";

      // If 4+ parts, assume: Team, Jersey, Name, Position
      if (parts.length >= 4) {
        team = parts[0];
        jersey = parts[1];
        name = parts[2];
        pos = parts.slice(3).join(" ");
      } 
      // If 3 parts, assume: Jersey, Name, Position (uses default team)
      else if (parts.length === 3) {
        if (!isNaN(parts[0])) {
          jersey = parts[0];
          name = parts[1];
          pos = parts[2];
        } else {
          name = parts[0];
          pos = parts.slice(1).join(" ");
        }
      }
      // If 2 parts, assume: Jersey, Name
      else if (parts.length === 2) {
        if (!isNaN(parts[0])) {
          jersey = parts[0];
          name = parts[1];
        } else {
          name = parts[0];
          pos = parts[1];
        }
      } else if (parts.length === 1) {
        name = parts[0];
      }

      return {
        match_id: matchId,
        team_name: team || "Unknown",
        player_name: name,
        jersey_number: jersey,
        position: pos
      };
    }).filter(p => p.player_name);

    if (newPlayers.length === 0) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("team_sheets")
      .insert(newPlayers)
      .select();

    if (!error && data) {
      setPlayers((prev) => [...prev, ...data]);
      setBulkText("");
      setMode("single");
      onPlayerChange && onPlayerChange(); // notify parent
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("team_sheets").delete().eq("id", id);
    if (!error) {
      setPlayers((prev) => prev.filter(p => p.id !== id));
      onPlayerChange && onPlayerChange(); // notify parent
    }
  };

  return (
    <div className="brutal-card" style={{ padding: 8, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ background: "#000", color: "#fff", padding: "4px 8px", fontWeight: 800, fontSize: "0.65rem" }}>
          📋 TEAM SHEET
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button 
            onClick={() => setMode("single")}
            className="brutal-btn" 
            style={{ fontSize: "0.55rem", padding: "2px 6px", background: mode === "single" ? "#FACC15" : "#fff" }}
          >
            SGL
          </button>
          <button 
            onClick={() => setMode("bulk")}
            className="brutal-btn" 
            style={{ fontSize: "0.55rem", padding: "2px 6px", background: mode === "bulk" ? "#FACC15" : "#fff" }}
          >
            BLK
          </button>
        </div>
      </div>
      
      {/* ADD PLAYER FORM */}
      {mode === "single" ? (
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          <input 
            className="brutal-input" style={{ flex: 1, minWidth: 80, fontSize: "0.65rem", padding: "4px" }} placeholder="Team" 
            value={form.team_name} onChange={(e) => setForm({...form, team_name: e.target.value})} required 
          />
          <input 
            className="brutal-input" style={{ width: 40, fontSize: "0.65rem", padding: "4px" }} placeholder="#" 
            value={form.jersey_number} onChange={(e) => setForm({...form, jersey_number: e.target.value})} 
          />
          <input 
            className="brutal-input" style={{ flex: 2, minWidth: 100, fontSize: "0.65rem", padding: "4px" }} placeholder="Name" 
            value={form.player_name} onChange={(e) => setForm({...form, player_name: e.target.value})} required 
          />
          <input 
            className="brutal-input" style={{ width: 40, fontSize: "0.65rem", padding: "4px" }} placeholder="Pos" 
            value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} 
          />
          <button type="submit" className="brutal-btn" style={{ background: "#2DD4BF", fontSize: "0.65rem", padding: "4px 8px" }}>+</button>
        </form>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            <input 
              className="brutal-input" style={{ flex: 1, fontSize: "0.65rem", padding: "4px" }} placeholder="Team" 
              value={form.team_name} onChange={(e) => setForm({...form, team_name: e.target.value})} required 
            />
            <button 
              onClick={handleBulkAdd} 
              className="brutal-btn" 
              style={{ background: "#2DD4BF", fontSize: "0.65rem", padding: "4px 8px" }}
              disabled={loading}
            >
              {loading ? "..." : "BLK"}
            </button>
          </div>
          <textarea 
            className="brutal-input" 
            style={{ width: "100%", height: 60, fontSize: "0.6rem", fontFamily: "monospace", padding: "4px" }} 
            placeholder="Team, Jersey, Name, Pos&#10;Example:&#10;PSG, 10, Messi, FW&#10;Inter, 10, Lautaro, FW"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
        </div>
      )}

      {/* PLAYER LIST */}
      <div style={{ flex: 1, maxHeight: 150, overflowY: "auto", border: "2px solid #000" }}>
        {players.length === 0 ? (
          <div style={{ padding: 8, textAlign: "center", fontSize: "0.65rem", color: "#666" }}>EMPTY</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.65rem" }}>
            <thead style={{ background: "#f0f0f0", borderBottom: "2px solid #000", position: "sticky", top: 0 }}>
              <tr>
                <th style={{ padding: 4, textAlign: "left" }}>T</th>
                <th style={{ padding: 4, textAlign: "left" }}>#</th>
                <th style={{ padding: 4, textAlign: "left" }}>NAME</th>
                <th style={{ padding: 4, textAlign: "left" }}>P</th>
                <th style={{ padding: 4 }}></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #ccc" }}>
                  <td style={{ padding: "4px" }}>{p.team_name.substring(0, 3)}</td>
                  <td style={{ padding: "4px" }}>{p.jersey_number}</td>
                  <td style={{ padding: "4px", fontWeight: 600 }}>{p.player_name}</td>
                  <td style={{ padding: "4px" }}>{p.position}</td>
                  <td style={{ padding: "4px", textAlign: "right" }}>
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

