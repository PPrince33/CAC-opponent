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
  const [tool, setTool] = useState("shot"); // 'shot' or 'pass'
  const [activeEventData, setActiveEventData] = useState(null); // { startX, startY, endX, endY }

  // Form state for inline tagging
  const [tagForm, setTagForm] = useState({
    team_type: "focus_team",
    event_type: "shot",
    action_player_id: "",
    reaction_player_id: "",
    shot_outcome: "",
    goal_x: null,
    goal_y: null
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Filters for Timeline
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterPlayer, setFilterPlayer] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterOutcome, setFilterOutcome] = useState("all");

  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const router = useRouter();

  // ─── Check Auth ───
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

  const loadMatches = async () => {
    const { data } = await supabase
      .from("opp_matches")
      .select("*")
      .order("created_at", { ascending: false });
    setMatches(data || []);
  };

  useEffect(() => {
    loadMatches();
  }, []);

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
    setTagForm(f => ({ ...f, event_type: tool }));
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
    if (!error && data) {
      setEvents((prev) => [...prev, data]);
      setActiveEventData(null);
      setTagForm({ team_type: "focus_team", event_type: "shot", action_player_id: "", reaction_player_id: "", shot_outcome: "", goal_x: null, goal_y: null });
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

  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (filterTeam !== "all" && ev.team_type !== filterTeam) return false;
      if (filterPlayer !== "all" && ev.action_player_id !== filterPlayer) return false;
      if (filterAction !== "all" && ev.event_type !== filterAction) return false;
      if (filterOutcome !== "all") {
        if (filterOutcome === "goal" && ev.shot_outcome !== "goal") return false;
        if (filterOutcome === "miss" && ev.shot_outcome === "goal") return false;
      }
      return true;
    });
  }, [events, filterTeam, filterPlayer, filterAction, filterOutcome]);

  if (!authChecked) return null;

  let youtubeId = null;
  let videoLink = selectedMatch?.video_link;
  if (videoLink) {
    const ytMatch = videoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (ytMatch) youtubeId = ytMatch[1];
  }

  return (
    <div style={{ padding: 16, maxWidth: "1600px", margin: "0 auto", paddingBottom: 120 }}>
      {/* ─── TOP CONTROL BAR ─── */}
      <div style={{ background: "#34D399", border: "3px solid #000", boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>MATCH:</label>
          <select className="brutal-select" value={selectedMatchId} onChange={(e) => setSelectedMatchId(e.target.value)} style={{ minWidth: 260 }}>
            <option value="">— SELECT MATCH —</option>
            {matches.map((m) => (<option key={m.id} value={m.id}>{m.home_team} VS {m.away_team}</option>))}
          </select>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="brutal-btn" style={{ background: "#000", color: "#FACC15", fontSize: "0.75rem" }}>+ NEW MATCH</button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 0 }}>
            {["L2R", "R2L"].map((d) => (
              <button key={d} onClick={() => setDirection(d)} className="brutal-btn" style={{ background: direction === d ? "#000" : "#fff", color: direction === d ? "#34D399" : "#000", fontSize: "0.75rem", padding: "6px 14px" }}>
                {d === "L2R" ? "→ L2R" : "← R2L"}
              </button>
            ))}
          </div>
          <input className="brutal-input" style={{ width: 90 }} value={timestamp} onChange={(e) => setTimestamp(e.target.value)} placeholder="MM:SS" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16, marginBottom: 16 }}>
        {/* LEFT: VIDEO PLAYER */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="brutal-card" style={{ overflow: "hidden" }}>
            <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem", display: "flex", justifyContent: "space-between" }}>
              <span>📹 VIDEO PLAYER</span>
            </div>
            <div style={{ aspectRatio: "16/9", background: "#111" }}>
              {youtubeId ? (
                <YouTube videoId={youtubeId} opts={{ width: "100%", height: "100%", playerVars: { autoplay: 0, rel: 0, modestbranding: 1 } }} onReady={(e) => { ytPlayerRef.current = e.target; }} style={{ width: "100%", height: "100%" }} />
              ) : videoLink ? (
                <video ref={videoRef} src={videoLink} controls style={{ width: "100%", height: "100%" }} />
              ) : null}
            </div>
          </div>
        </div>

        {/* RIGHT: SIDEBAR (PITCH & INLINE FORM) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          
          <div className="brutal-card" style={{ padding: 8 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              <button onClick={() => setTool("shot")} className="brutal-btn" style={{ flex: 1, fontSize: "0.65rem", padding: "4px", background: tool === "shot" ? "#000" : "#fff", color: tool === "shot" ? "#34D399" : "#000" }}>🎯 SHOT</button>
              <button onClick={() => setTool("pass")} className="brutal-btn" style={{ flex: 1, fontSize: "0.65rem", padding: "4px", background: tool === "pass" ? "#000" : "#fff", color: tool === "pass" ? "#FACC15" : "#000" }}>↗️ PASS</button>
            </div>
            <HighlightTaggerPitch events={events} tool={tool} onEventComplete={handlePitchInteraction} onEventClick={(ev) => handleSeek(ev.timestamp)} />
          </div>

          {activeEventData ? (
            <div className="brutal-card animate-pop-in" style={{ padding: 12, border: "3px solid #34D399" }}>
              <div style={{ background: "#34D399", color: "#000", padding: "4px 8px", fontWeight: 800, fontSize: "0.65rem", marginBottom: 12 }}>⚡ LOG EVENT</div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: "0.6rem", fontWeight: 800 }}>TEAM</label>
                  <select className="brutal-select w-full" style={{ fontSize: "0.65rem", padding: "4px" }} value={tagForm.team_type} onChange={e => setTagForm({...tagForm, team_type: e.target.value})}>
                    <option value="focus_team">{selectedMatch?.home_team?.toUpperCase()}</option>
                    <option value="opponent">{selectedMatch?.away_team?.toUpperCase()}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.6rem", fontWeight: 800 }}>ACTION</label>
                  <select className="brutal-select w-full" style={{ fontSize: "0.65rem", padding: "4px" }} value={tagForm.event_type} onChange={e => setTagForm({...tagForm, event_type: e.target.value})}>
                    {tool === "shot" ? <option value="shot">SHOT</option> : <><option value="key_pass">KEY PASS</option><option value="assist">ASSIST</option></>}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: "0.6rem", fontWeight: 800 }}>PLAYER</label>
                  <select className="brutal-select w-full" style={{ fontSize: "0.65rem", padding: "4px" }} value={tagForm.action_player_id} onChange={e => setTagForm({...tagForm, action_player_id: e.target.value})}>
                    <option value="">— SELECT —</option>
                    {teamSheet.map(p => (<option key={p.id} value={p.id}>{p.jersey_number} {p.player_name}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.6rem", fontWeight: 800 }}>TO (REACTION)</label>
                  <select className="brutal-select w-full" style={{ fontSize: "0.65rem", padding: "4px" }} value={tagForm.reaction_player_id} onChange={e => setTagForm({...tagForm, reaction_player_id: e.target.value})}>
                    <option value="">— SELECT —</option>
                    {teamSheet.map(p => (<option key={p.id} value={p.id}>{p.jersey_number} {p.player_name}</option>))}
                  </select>
                </div>
              </div>

              {tagForm.event_type === "shot" && (
                <div style={{ borderTop: "1px solid #ddd", paddingTop: 8 }}>
                   <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    {["goal", "target", "blocked", "miss"].map(o => (
                      <button key={o} onClick={() => setTagForm({...tagForm, shot_outcome: o})} className="brutal-btn" style={{ flex: 1, fontSize: "0.55rem", padding: "4px", background: tagForm.shot_outcome === o ? "#000" : "#fff", color: tagForm.shot_outcome === o ? "#FACC15" : "#000" }}>{o.toUpperCase()}</button>
                    ))}
                  </div>
                  <div onClick={handleGoalClick} style={{ aspectRatio: "3/1", background: "#f0f0f0", border: "2px solid #000", position: "relative", cursor: "crosshair" }}>
                     <div style={{ position: "absolute", top: "10%", left: "5%", right: "5%", bottom: 0, border: "2px solid #666", borderBottom: "none" }}></div>
                     {tagForm.goal_x !== null && <div style={{ position: "absolute", left: `${tagForm.goal_x}%`, top: `${tagForm.goal_y}%`, width: 8, height: 8, background: "#EF4444", borderRadius: "50%", transform: "translate(-50%, -50%)", border: "1px solid #000" }}></div>}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={handleSaveEvent} className="brutal-btn" style={{ background: "#34D399", flex: 1, fontSize: "0.7rem", padding: "8px" }}>SAVE ACTION</button>
                <button onClick={() => setActiveEventData(null)} className="brutal-btn" style={{ background: "#fff", fontSize: "0.7rem", padding: "8px" }}>CANCEL</button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              {selectedMatch && <TeamSheetManager matchId={selectedMatchId} />}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM: TIMELINE */}
      <div className="brutal-card" style={{ display: "flex", flexDirection: "column", minHeight: 300 }}>
        <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>📋 EVENT TIMELINE</span>
          <div style={{ display: "flex", gap: 8 }}>
             <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 8px", background: "#fff", color: "#000" }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}><option value="all">ALL TEAMS</option><option value="focus_team">HOME</option><option value="opponent">AWAY</option></select>
             <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 8px", background: "#fff", color: "#000" }} value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}><option value="all">ALL PLAYERS</option>{teamSheet.map(p => (<option key={p.id} value={p.id}>{p.jersey_number} {p.player_name}</option>))}</select>
             <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 8px", background: "#fff", color: "#000" }} value={filterAction} onChange={e => setFilterAction(e.target.value)}><option value="all">ALL ACTIONS</option><option value="shot">SHOTS</option><option value="key_pass">KEY PASSES</option><option value="assist">ASSISTS</option></select>
             <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 8px", background: "#fff", color: "#000" }} value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}><option value="all">ALL OUTCOMES</option><option value="goal">GOALS</option><option value="miss">OTHER</option></select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredEvents.length === 0 ? <p style={{ fontSize: "0.8rem", color: "#666", textAlign: "center", padding: 64 }}>NO MATCHING EVENTS</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f0f0f0", borderBottom: "2px solid #000", zIndex: 1 }}><tr style={{ color: "#666", fontWeight: 700 }}><th style={{ padding: "12px 16px", textAlign: "left", width: 80 }}>TIME</th><th style={{ padding: "12px 16px", textAlign: "left", width: 40 }}>T</th><th style={{ padding: "12px 16px", textAlign: "left" }}>PLAYER</th><th style={{ padding: "12px 16px", textAlign: "left" }}>ACTION</th><th style={{ padding: "12px 16px", textAlign: "left" }}>OUTCOME</th><th style={{ padding: "12px 16px", textAlign: "right" }}></th></tr></thead>
              <tbody>{filteredEvents.map((ev) => { const player = teamSheet.find(p => p.id === ev.action_player_id); return (<tr key={ev.id} onClick={() => handleSeek(ev.timestamp)} className="timeline-row" style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}><td style={{ padding: "12px 16px", fontWeight: 800 }}>{ev.timestamp || "0'"}</td><td style={{ padding: "12px 16px" }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: ev.team_type === 'focus_team' ? '#34D399' : '#F87171' }}></div></td><td style={{ padding: "12px 16px", fontWeight: 600 }}>{player ? `${player.jersey_number} ${player.player_name.toUpperCase()}` : "—"}</td><td style={{ padding: "12px 16px" }}>{ev.event_type.replace("_", " ").toUpperCase()}</td><td style={{ padding: "12px 16px", fontWeight: 700, color: ev.shot_outcome === "goal" ? "#34D399" : "#000" }}>{ev.shot_outcome ? ev.shot_outcome.toUpperCase() : "SUCCESSFUL"}</td><td style={{ padding: "12px 16px", textAlign: "right" }}><button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} style={{ color: "#ccc", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}>✕</button></td></tr>); })}</tbody>
            </table>
          )}
        </div>
      </div>

      {showCreateModal && <MatchModal onSave={handleCreateMatch} onCancel={() => setShowCreateModal(false)} />}
      <style jsx>{`.timeline-row:hover { background: #f0fdf4; }`}</style>
    </div>
  );
}
