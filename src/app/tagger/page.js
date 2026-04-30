"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import YouTube from "react-youtube";
import HighlightTaggerPitch from "@/components/HighlightTaggerPitch";
import TeamSheetManager from "@/components/TeamSheetManager";
import MatchModal from "@/components/MatchModal";

export default function TaggerPage() {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  const [events, setEvents] = useState([]);
  const [teamSheet, setTeamSheet] = useState([]);

  const [direction, setDirection] = useState("L2R");
  const [timestamp, setTimestamp] = useState("");
  const [activeEventData, setActiveEventData] = useState(null); 

  // Form state - matching the screenshot
  const [tagForm, setTagForm] = useState({
    team_type: "focus_team",
    event_type: "shot",
    action_player_id: "",
    reaction_player_id: "",
    shot_outcome: "Successful",
    body_part: "Right Leg",
    pressure: false,
    notes: "",
    goal_x: null,
    goal_y: null
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const router = useRouter();

  // ─── Hotkeys ───
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (ytPlayerRef.current) {
          const state = ytPlayerRef.current.getPlayerState();
          if (state === 1) ytPlayerRef.current.pauseVideo();
          else ytPlayerRef.current.playVideo();
        } else if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
        }
      }

      if (e.code === "Enter") {
        e.preventDefault();
        if (activeEventData) handleSaveEvent();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEventData]);

  const loadMatches = async () => {
    const { data } = await supabase.from("opp_matches").select("*").order("created_at", { ascending: false });
    setMatches(data || []);
  };

  useEffect(() => { loadMatches(); }, []);

  useEffect(() => {
    if (!selectedMatchId) {
      setEvents([]);
      setTeamSheet([]);
      setSelectedMatch(null);
      return;
    }
    const match = matches.find((m) => m.id === selectedMatchId);
    setSelectedMatch(match);
    
    supabase.from("highlight_events").select("*").eq("match_id", selectedMatchId).order("created_at", { ascending: true })
      .then(({ data }) => setEvents(data || []));

    supabase.from("team_sheets").select("*").eq("match_id", selectedMatchId)
      .then(({ data }) => setTeamSheet(data || []));
  }, [selectedMatchId, matches]);

  const handlePitchInteraction = (startX, startY, endX, endY) => {
    setActiveEventData({ startX, startY, endX, endY });
  };

  const handleSaveEvent = async () => {
    if (!selectedMatchId || !activeEventData) return;

    let currentTime = timestamp;
    let timeInSeconds = null;

    if (videoRef.current) timeInSeconds = videoRef.current.currentTime;
    else if (ytPlayerRef.current) timeInSeconds = ytPlayerRef.current.getCurrentTime();

    if (timeInSeconds !== null) {
      const m = Math.floor(timeInSeconds / 60).toString().padStart(2, "0");
      const s = Math.floor(timeInSeconds % 60).toString().padStart(2, "0");
      currentTime = `${m}:${s}`;
      setTimestamp(currentTime);
    }

    const payload = {
      match_id: selectedMatchId,
      timestamp: currentTime,
      home_team_direction: direction,
      start_x: activeEventData.startX,
      start_y: activeEventData.startY,
      end_x: activeEventData.endX,
      end_y: activeEventData.endY,
      ...tagForm
    };

    const { data, error } = await supabase.from("highlight_events").insert([payload]).select().single();
    if (error) {
      alert(`Save Failed: ${error.message}`);
      return;
    }
    if (data) {
      setEvents((prev) => [...prev, data]);
      setActiveEventData(null);
      setTagForm(f => ({ ...f, action_player_id: "", reaction_player_id: "", notes: "", goal_x: null, goal_y: null }));
    }
  };

  const handleDeleteEvent = async (id) => {
    const { error } = await supabase.from("highlight_events").delete().eq("id", id);
    if (!error) setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  const handleSeek = (timestamp) => {
    if (!timestamp) return;
    const parts = timestamp.split(':');
    const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    if (ytPlayerRef.current) ytPlayerRef.current.seekTo(seconds, true);
    else if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.play(); }
  };

  const handleGoalClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTagForm(f => ({ ...f, goal_x: Math.round(x), goal_y: Math.round(y) }));
  };

  const filteredTeamPlayers = useMemo(() => {
    const targetTeam = tagForm.team_type === "focus_team" ? selectedMatch?.home_team : selectedMatch?.away_team;
    return teamSheet.filter(p => p.team_name === targetTeam);
  }, [teamSheet, tagForm.team_type, selectedMatch]);

  let youtubeId = null;
  let videoLink = selectedMatch?.video_link;
  if (videoLink) {
    const ytMatch = videoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (ytMatch) youtubeId = ytMatch[1];
  }

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "16px 24px", color: "#1f2937", fontFamily: "sans-serif" }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, color: "#111827" }}>
            {selectedMatch ? `${selectedMatch.home_team} vs ${selectedMatch.away_team}` : "Select a Match"}
          </h1>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4, fontWeight: 600 }}>
            MATCH ID: {selectedMatchId?.substring(0, 8).toUpperCase() || "N/A"} | FOOTBALL
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
           <button className="clean-btn">Undo</button>
           <button className="clean-btn">Keys [?]</button>
           <button className="clean-btn">Toggle Sidebar</button>
           <button className="clean-btn">Back</button>
           <button className="finish-btn">Finish Match</button>
        </div>
      </div>

      {/* VIDEO LOADER BAR */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", marginBottom: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        <select className="clean-select" style={{ width: 120 }}>
          <option>YouTube</option>
          <option>Direct</option>
        </select>
        <input 
          className="clean-input" style={{ flex: 1 }} 
          value={selectedMatch?.video_link || ""} 
          readOnly
          placeholder="Video URL..."
        />
        <button className="load-btn">Load</button>
        <select className="clean-select" style={{ width: 80 }}>
          <option>1x</option>
          <option>1.5x</option>
          <option>2x</option>
        </select>
      </div>

      {/* MAIN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 24 }}>
        
        {/* LEFT: PLAYER */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
           <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", position: "relative", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
              <div style={{ aspectRatio: "16/9", background: "#111" }}>
                {youtubeId ? (
                  <YouTube videoId={youtubeId} opts={{ width: "100%", height: "100%", playerVars: { autoplay: 0, rel: 0, modestbranding: 1 } }} onReady={(e) => { ytPlayerRef.current = e.target; }} style={{ width: "100%", height: "100%" }} />
                ) : videoLink ? (
                  <video ref={videoRef} src={videoLink} controls style={{ width: "100%", height: "100%" }} />
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563" }}>NO VIDEO LOADED</div>
                )}
              </div>
           </div>
           
           {/* EVENT LOG TABLE */}
           <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>Event Log</span>
                <button style={{ color: "#22c55e", fontSize: "0.75rem", fontWeight: 700 }}>Sync ALL</button>
              </div>
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                  <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <tr>
                      <th className="log-th">TIME</th>
                      <th className="log-th">TEAM</th>
                      <th className="log-th">PLAYER</th>
                      <th className="log-th">ACTION</th>
                      <th className="log-th">OUTCOME</th>
                      <th className="log-th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => {
                      const p = teamSheet.find(ts => ts.id === ev.action_player_id);
                      return (
                        <tr key={ev.id} onClick={() => handleSeek(ev.timestamp)} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} className="log-tr">
                          <td className="log-td" style={{ fontWeight: 700 }}>{ev.timestamp}</td>
                          <td className="log-td">{ev.team_type === 'focus_team' ? "HOME" : "AWAY"}</td>
                          <td className="log-td" style={{ fontWeight: 600 }}>{p ? `${p.jersey_number} ${p.player_name}` : "—"}</td>
                          <td className="log-td">{ev.event_type.toUpperCase()}</td>
                          <td className="log-td">{ev.shot_outcome || "SUCCESS"}</td>
                          <td className="log-td" style={{ textAlign: "right" }}>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} style={{ color: "#ef4444" }}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
           </div>
        </div>

        {/* RIGHT: SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* PITCH */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
             <HighlightTaggerPitch 
               events={events} 
               startPoint={activeEventData ? { x: activeEventData.startX, y: activeEventData.startY } : null}
               endPoint={activeEventData ? { x: activeEventData.endX, y: activeEventData.endY } : null}
               onEventComplete={handlePitchInteraction}
               onClear={() => setActiveEventData(null)}
             />
          </div>

          {/* FORM */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="form-label">Team</label>
                <select className="clean-select w-full" value={tagForm.team_type} onChange={e => setTagForm({...tagForm, team_type: e.target.value})}>
                   <option value="focus_team">{selectedMatch?.home_team || "Home"}</option>
                   <option value="opponent">{selectedMatch?.away_team || "Away"}</option>
                </select>
              </div>
              <div>
                <label className="form-label">Player</label>
                <select className="clean-select w-full" value={tagForm.action_player_id} onChange={e => setTagForm({...tagForm, action_player_id: e.target.value})}>
                  <option value="">— Select Player —</option>
                  {filteredTeamPlayers.map(p => (<option key={p.id} value={p.id}>{p.jersey_number} {p.player_name}</option>))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="form-label">Action</label>
                <select className="clean-select w-full" value={tagForm.event_type} onChange={e => setTagForm({...tagForm, event_type: e.target.value})}>
                   <option value="shot">Shot</option>
                   <option value="key_pass">Pass</option>
                   <option value="assist">Assist</option>
                </select>
              </div>
              <div>
                <label className="form-label">Outcome [Tab]</label>
                <select className="clean-select w-full" value={tagForm.shot_outcome} onChange={e => setTagForm({...tagForm, shot_outcome: e.target.value})}>
                   <option>Successful</option>
                   <option>Goal</option>
                   <option>On Target</option>
                   <option>Blocked</option>
                   <option>Miss</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="form-label">Type</label>
                <select className="clean-select w-full">
                   <option>Normal Play</option>
                   <option>Set Piece</option>
                </select>
              </div>
              <div>
                <label className="form-label">Body Part</label>
                <select className="clean-select w-full" value={tagForm.body_part} onChange={e => setTagForm({...tagForm, body_part: e.target.value})}>
                   <option>Right Leg [R]</option>
                   <option>Left Leg [L]</option>
                   <option>Head [H]</option>
                   <option>Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
               <button 
                onClick={() => setTagForm({...tagForm, pressure: !tagForm.pressure})}
                className={tagForm.pressure ? "toggle-btn active" : "toggle-btn"}
               >
                 Pressure: {tagForm.pressure ? "ON" : "OFF"}
               </button>
               <button 
                onClick={() => setDirection(direction === "L2R" ? "R2L" : "L2R")}
                className="toggle-btn"
               >
                 Direct: {direction}
               </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Notes [N] to focus</label>
              <textarea 
                className="clean-input w-full" 
                style={{ height: 60, padding: 8, fontSize: "0.75rem" }} 
                placeholder="Additional details..."
                value={tagForm.notes}
                onChange={e => setTagForm({...tagForm, notes: e.target.value})}
              />
            </div>

            <button 
              onClick={handleSaveEvent}
              disabled={!activeEventData}
              style={{ width: "100%", background: "#22c55e", color: "#fff", border: "none", padding: "14px", borderRadius: 8, fontWeight: 800, fontSize: "1rem", cursor: "pointer", opacity: activeEventData ? 1 : 0.5 }}
            >
              Log Event [Enter]
            </button>
          </div>

          {/* TEAM SHEET SECTION (If needed) */}
          {!activeEventData && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
               <TeamSheetManager matchId={selectedMatchId} />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .clean-btn {
          background: #fff;
          border: 1px solid #e5e7eb;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clean-btn:hover { background: #f9fafb; border-color: #d1d5db; }
        
        .finish-btn {
          background: #22c55e;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .load-btn {
          background: #111827;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .clean-select, .clean-input {
          border: 1px solid #d1d5db;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          outline: none;
        }
        .clean-select:focus, .clean-input:focus { border-color: #22c55e; box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.1); }
        
        .form-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: #6b7280;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .toggle-btn {
          background: #fff;
          border: 1px solid #e5e7eb;
          padding: 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
        }
        .toggle-btn.active {
          background: #ef4444;
          color: #fff;
          border-color: #ef4444;
        }

        .log-th { padding: 12px 16px; text-align: left; color: #6b7280; font-weight: 700; font-size: 0.65rem; }
        .log-td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; }
        .log-tr:hover { background: #f0fdf4; }

        .w-full { width: 100%; }
      `}</style>

      {showCreateModal && <MatchModal onSave={loadMatches} onCancel={() => setShowCreateModal(false)} />}
    </div>
  );
}
