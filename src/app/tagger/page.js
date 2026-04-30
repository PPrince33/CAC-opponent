"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import YouTube from "react-youtube";
import HighlightTaggerPitch from "@/components/HighlightTaggerPitch";
import TeamSheetManager from "@/components/TeamSheetManager";
import MatchModal from "@/components/MatchModal";
import { normalizeHighlightEventV2 } from "@/lib/normalize";

export default function TaggerPage() {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  const [events, setEvents] = useState([]);
  const [teamSheet, setTeamSheet] = useState([]);

  const [direction, setDirection] = useState("L2R"); // always = HOME TEAM direction
  const [timestamp, setTimestamp] = useState("");
  const [activeEventData, setActiveEventData] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const flipDir = (d) => d === "L2R" ? "R2L" : "L2R";
  // Derived: direction the current action_team is actually attacking
  const actingTeamDirection = (teamName) =>
    teamName === selectedMatch?.home_team ? direction : flipDir(direction);

  // Form state for inline tagging
  const [tagForm, setTagForm] = useState({
    action_team: "",      // Real team name e.g. "Arsenal"
    event_type: "shot",
    action_player_id: "",
    reaction_player_id: "",
    shot_outcome: null,
    body_part: null,
    half: "1st",
    goal_x: null,
    goal_y: null
  });

  const [finishLoading, setFinishLoading] = useState(false);

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

  // ─── Hotkeys ───
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input or textarea
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        return;
      }

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
        if (activeEventData) {
          handleSaveEvent();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeEventData, ytPlayerRef, videoRef, tagForm]); // Depend on relevant state

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
    // Default action_team to away team (the scouted opponent)
    setTagForm(f => ({ ...f, action_team: match?.away_team || "" }));
    
    supabase.from("highlight_events").select("*").eq("match_id", selectedMatchId).order("created_at", { ascending: true })
      .then(({ data }) => setEvents(data || []));

    // Load team sheet initially
    supabase.from("team_sheets").select("*").eq("match_id", selectedMatchId)
      .then(({ data }) => setTeamSheet(data || []));

    // Real-time subscription: update teamSheet whenever a player is added/changed/removed
    const channel = supabase
      .channel(`team_sheets_${selectedMatchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_sheets", filter: `match_id=eq.${selectedMatchId}` },
        () => {
          // Re-fetch full list on any change
          supabase.from("team_sheets").select("*").eq("match_id", selectedMatchId)
            .then(({ data }) => setTeamSheet(data || []));
        }
      )
      .subscribe();

    // Cleanup subscription when match changes
    return () => { supabase.removeChannel(channel); };
  }, [selectedMatchId, matches]);

  const handlePitchInteraction = (startX, startY, endX, endY) => {
    setActiveEventData({ startX, startY, endX, endY });
  };

  const handleSaveEvent = useCallback(async () => {
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

    // home_team_direction is always from the HOME team's perspective.
    // If acting team = away → flip the direction toggle value before storing.
    const homeDir = tagForm.action_team === selectedMatch?.home_team
      ? direction
      : flipDir(direction);

    const payload = {
      match_id: selectedMatchId,
      timestamp: currentTime,
      home_team_direction: homeDir,
      start_x: activeEventData.startX,
      start_y: activeEventData.startY,
      end_x: activeEventData.endX,
      end_y: activeEventData.endY,
      ...tagForm,
      action_player_id:   tagForm.action_player_id   || null,
      reaction_player_id: tagForm.reaction_player_id || null,
    };

    const { data, error } = await supabase.from("highlight_events").insert([payload]).select().single();
    
    if (error) {
      console.error("SAVE ERROR:", error);
      alert(`SAVE FAILED: ${error.message}`);
      return;
    }

    if (data) {
      setEvents((prev) => [...prev, data]);
      setActiveEventData(null);
      setTagForm(f => ({ ...f, action_player_id: "", reaction_player_id: "", shot_outcome: null, body_part: null, goal_x: null, goal_y: null }));
    }
  }, [selectedMatchId, activeEventData, timestamp, direction, tagForm, ytPlayerRef, videoRef]);

  // ─── Finish Highlight: Normalize and push to normalized_highlight_events ───
  const handleFinishHighlight = async () => {
    if (!selectedMatchId || !selectedMatch) return;
    const scoutedTeam = selectedMatch.away_team; // The opponent team being scouted
    setFinishLoading(true);
    try {
      // 1. Fetch all raw events for this match
      const { data: rawEvents, error: fetchErr } = await supabase
        .from("highlight_events")
        .select("*")
        .eq("match_id", selectedMatchId);

      if (fetchErr) throw fetchErr;

      // 2. Delete existing normalized events for this match (re-processable)
      await supabase
        .from("normalized_highlight_events")
        .delete()
        .eq("match_id", selectedMatchId);

      // 3. Normalize each event
      const normalized = (rawEvents || []).map(ev => {
        const norm = normalizeHighlightEventV2(ev, scoutedTeam, selectedMatch);
        return {
          source_event_id:  ev.id,
          match_id:         ev.match_id,
          opponent_team:    scoutedTeam,
          timestamp:        ev.timestamp,
          event_type:       ev.event_type,
          action_team:      ev.action_team,
          start_x:          norm.start_x,
          start_y:          norm.start_y,
          end_x:            norm.end_x,
          end_y:            norm.end_y,
          shot_outcome:     ev.shot_outcome,
          body_part:        ev.body_part,
          half:             ev.half,
          action_player_id: ev.action_player_id,
          video_link:       selectedMatch.video_link,
        };
      });

      // 4. Insert normalized events
      if (normalized.length > 0) {
        const { error: insertErr } = await supabase
          .from("normalized_highlight_events")
          .insert(normalized);
        if (insertErr) throw insertErr;
      }

      alert(`✅ Finished! ${normalized.length} events normalized for ${scoutedTeam}.`);
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setFinishLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    const { error } = await supabase.from("highlight_events").delete().eq("id", id);
    if (!error) setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  // Inline-edit a single field on an existing event
  const handleUpdateEvent = async (id, field, value) => {
    const safeValue = (field === 'action_player_id' || field === 'reaction_player_id') 
      ? (value || null) 
      : (value === '' ? null : value);
    const { error } = await supabase
      .from('highlight_events')
      .update({ [field]: safeValue })
      .eq('id', id);
    if (!error) {
      setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, [field]: safeValue } : ev));
    }
  };

  const handleSeek = (ev) => {
    if (!ev || !ev.timestamp) return;
    const parts = ev.timestamp.split(':');
    let seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    
    // Seek to 5 seconds before, clamped at 0
    seconds = Math.max(0, seconds - 5);
    
    if (ytPlayerRef.current) ytPlayerRef.current.seekTo(seconds, true);
    else if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.play(); }
    
    setSelectedEventId(ev.id);
  };

  const handleGoalClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTagForm(f => ({ ...f, goal_x: Math.round(x), goal_y: Math.round(y) }));
  };

  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (filterTeam !== "all" && ev.action_team !== filterTeam) return false;
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

  const thStyle = { padding: "8px 6px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 800, fontSize: "0.65rem" };

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
          {selectedMatchId && (
            <button
              onClick={handleFinishHighlight}
              disabled={finishLoading}
              className="brutal-btn"
              style={{ background: finishLoading ? "#666" : "#EF4444", color: "#fff", fontSize: "0.75rem", fontWeight: 900 }}
            >
              {finishLoading ? "PROCESSING..." : "✓ FINISH HIGHLIGHT"}
            </button>
          )}
          <div style={{ display: "flex", gap: 0 }}>
            <label style={{ fontSize: "0.65rem", fontWeight: 700, alignSelf: "center", marginRight: 4, color: "#000", whiteSpace: "nowrap" }}>
              HOME DIR:
            </label>
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
          
          <div style={{ marginBottom: 4 }}>
            <HighlightTaggerPitch 
              events={events} 
              selectedEventId={selectedEventId}
              onEventComplete={handlePitchInteraction} 
              onEventClick={(ev) => handleSeek(ev)} 
            />
          </div>

          {activeEventData ? (
            <div className="brutal-card animate-pop-in" style={{ padding: 12, border: "3px solid #34D399", background: "#fff" }}>
              <div style={{ background: "#000", color: "#34D399", padding: "6px 10px", fontWeight: 800, fontSize: "0.7rem", marginBottom: 12, textAlign: "center" }}>
                ⚡ LOGGING ACTION
              </div>
              
              {/* STEP 1: TEAM & PLAYER */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.6rem", fontWeight: 800, color: "#666" }}>1. TEAM & PLAYER</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 6, marginTop: 4 }}>
                  <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "4px" }} value={tagForm.action_team} onChange={e => setTagForm({...tagForm, action_team: e.target.value})}>
                    <option value="">— TEAM —</option>
                    {selectedMatch && [
                      <option key="home" value={selectedMatch.home_team}>{selectedMatch.home_team.toUpperCase()}</option>,
                      <option key="away" value={selectedMatch.away_team}>{selectedMatch.away_team.toUpperCase()}</option>
                    ]}
                  </select>
                  <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "4px" }} value={tagForm.action_player_id} onChange={e => setTagForm({...tagForm, action_player_id: e.target.value})}>
                    <option value="">— SELECT PLAYER —</option>
                    {teamSheet
                      .filter(p => !tagForm.action_team || p.team_name === tagForm.action_team)
                      .map(p => (<option key={p.id} value={p.id}>{p.jersey_number} {p.player_name.toUpperCase()}</option>))}
                  </select>
                </div>
              </div>

              {/* STEP 2: ACTION & OUTCOME */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.6rem", fontWeight: 800, color: "#666" }}>2. ACTION & OUTCOME</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 4 }}>
                  <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "4px" }} value={tagForm.half} onChange={e => setTagForm({...tagForm, half: e.target.value})}>
                    <option value="1st">1ST HALF</option>
                    <option value="2nd">2ND HALF</option>
                  </select>
                  <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "4px" }} value={tagForm.event_type} onChange={e => setTagForm({...tagForm, event_type: e.target.value})}>
                    <option value="shot">SHOT</option>
                    <option value="key_pass">KEY PASS</option>
                    <option value="assist">ASSIST</option>
                  </select>
                  <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "4px" }} value={tagForm.shot_outcome || ""} onChange={e => setTagForm({...tagForm, shot_outcome: e.target.value || null})}>
                    <option value="">— OUTCOME —</option>
                    <option value="goal">GOAL</option>
                    <option value="target">ON TARGET</option>
                    <option value="blocked">BLOCKED</option>
                    <option value="miss">MISS</option>
                  </select>
                </div>
                {/* Reaction player — always available (GK for shots, receiver for passes) */}
                <div style={{ marginTop: 6 }}>
                  <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "4px", width: "100%" }} value={tagForm.reaction_player_id} onChange={e => setTagForm({...tagForm, reaction_player_id: e.target.value})}>
                    <option value="">{tagForm.event_type === "shot" ? "— GOALKEEPER / BLOCKER —" : "— TARGET PLAYER —"}</option>
                    {teamSheet.map(p => (<option key={p.id} value={p.id}>{p.jersey_number} {p.player_name.toUpperCase()} ({p.team_name})</option>))}
                  </select>
                </div>
              </div>

              {/* STEP 3: BODY PART */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.6rem", fontWeight: 800, color: "#666" }}>3. BODY PART</label>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {["right_foot", "left_foot", "head"].map(bp => (
                    <button 
                      key={bp} 
                      onClick={() => setTagForm({...tagForm, body_part: tagForm.body_part === bp ? null : bp})}
                      className="brutal-btn"
                      style={{ 
                        flex: 1, fontSize: "0.55rem", padding: "6px 2px",
                        background: tagForm.body_part === bp ? "#000" : "#fff",
                        color: tagForm.body_part === bp ? "#34D399" : "#000"
                      }}
                    >
                      {bp.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 4: GOAL TARGET (SHOTS ONLY) */}
              {tagForm.event_type === "shot" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: "0.6rem", fontWeight: 800, color: "#666" }}>4. GOAL TARGET</label>
                  <div onClick={handleGoalClick} style={{ aspectRatio: "3/1", background: "#f0f0f0", border: "2px solid #000", position: "relative", cursor: "crosshair", marginTop: 4 }}>
                     <div style={{ position: "absolute", top: "10%", left: "5%", right: "5%", bottom: 0, border: "2px solid #666", borderBottom: "none" }}></div>
                     {tagForm.goal_x !== null && <div style={{ position: "absolute", left: `${tagForm.goal_x}%`, top: `${tagForm.goal_y}%`, width: 8, height: 8, background: "#EF4444", borderRadius: "50%", transform: "translate(-50%, -50%)", border: "1px solid #000" }}></div>}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={handleSaveEvent} className="brutal-btn" style={{ background: "#34D399", color: "#000", flex: 2, fontSize: "0.75rem", fontWeight: 900, padding: "10px" }}>✓ LOG ENTRY</button>
                <button onClick={() => setActiveEventData(null)} className="brutal-btn" style={{ background: "#fff", flex: 1, fontSize: "0.7rem" }}>CANCEL</button>
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
          <span>📋 EVENT TIMELINE ({filteredEvents.length})</span>
          <div style={{ display: "flex", gap: 8 }}>
             <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 8px", background: "#fff", color: "#000" }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
               <option value="all">ALL TEAMS</option>
               {selectedMatch && <>
                 <option value={selectedMatch.home_team}>{selectedMatch.home_team}</option>
                 <option value={selectedMatch.away_team}>{selectedMatch.away_team}</option>
               </>}
             </select>
             <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 8px", background: "#fff", color: "#000" }} value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}><option value="all">ALL PLAYERS</option>{teamSheet.map(p => (<option key={p.id} value={p.id}>{p.jersey_number} {p.player_name}</option>))}</select>
             <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 8px", background: "#fff", color: "#000" }} value={filterAction} onChange={e => setFilterAction(e.target.value)}><option value="all">ALL ACTIONS</option><option value="shot">SHOTS</option><option value="key_pass">KEY PASSES</option><option value="assist">ASSISTS</option></select>
             <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 8px", background: "#fff", color: "#000" }} value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}><option value="all">ALL OUTCOMES</option><option value="goal">GOALS</option><option value="miss">OTHER</option></select>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
          {filteredEvents.length === 0 
            ? <p style={{ fontSize: "0.8rem", color: "#666", textAlign: "center", padding: 64 }}>NO MATCHING EVENTS</p> 
            : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem", minWidth: 900 }}>
              <thead style={{ position: "sticky", top: 0, background: "#f0f0f0", borderBottom: "2px solid #000", zIndex: 1 }}>
                <tr style={{ color: "#555", fontWeight: 800 }}>
                  <th style={thStyle}>TIME</th>
                  <th style={thStyle}>HALF</th>
                  <th style={thStyle}>TEAM</th>
                  <th style={thStyle}>PLAYER</th>
                  <th style={thStyle}>ACTION</th>
                  <th style={thStyle}>OUTCOME</th>
                  <th style={thStyle}>BODY PART</th>
                  <th style={thStyle}>DIRECTION</th>
                  <th style={thStyle}>REACTION PLAYER</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>DEL</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => {
                  const isSelected = selectedEventId === ev.id;
                  const rowBg = isSelected ? "#f0fdf4" : "transparent";
                  const s = { padding: "4px 6px" };
                  return (
                    <tr key={ev.id} style={{ borderBottom: "1px solid #eee", background: rowBg }} className="timeline-row">
                      {/* TIME */}
                      <td style={s}>
                        <input
                          className="brutal-input"
                          style={{ width: 60, fontSize: "0.65rem", padding: "2px 4px" }}
                          defaultValue={ev.timestamp || ""}
                          onBlur={e => handleUpdateEvent(ev.id, 'timestamp', e.target.value)}
                          onClick={() => handleSeek(ev)}
                        />
                      </td>
                      {/* HALF */}
                      <td style={s}>
                        <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "2px 4px" }} value={ev.half || "1st"} onChange={e => handleUpdateEvent(ev.id, 'half', e.target.value)}>
                          <option value="1st">1ST</option>
                          <option value="2nd">2ND</option>
                        </select>
                      </td>
                      {/* TEAM */}
                      <td style={s}>
                        <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "2px 4px" }} value={ev.action_team || ""} onChange={e => handleUpdateEvent(ev.id, 'action_team', e.target.value)}>
                          <option value="">—</option>
                          {selectedMatch && <>
                            <option value={selectedMatch.home_team}>{selectedMatch.home_team}</option>
                            <option value={selectedMatch.away_team}>{selectedMatch.away_team}</option>
                          </>}
                        </select>
                      </td>
                      {/* ACTION PLAYER */}
                      <td style={s}>
                        <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "2px 4px", maxWidth: 130 }} value={ev.action_player_id || ""} onChange={e => handleUpdateEvent(ev.id, 'action_player_id', e.target.value)}>
                          <option value="">— PLAYER —</option>
                          {teamSheet.filter(p => !ev.action_team || p.team_name === ev.action_team).map(p => (
                            <option key={p.id} value={p.id}>{p.jersey_number} {p.player_name}</option>
                          ))}
                        </select>
                      </td>
                      {/* ACTION TYPE */}
                      <td style={s}>
                        <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "2px 4px" }} value={ev.event_type} onChange={e => handleUpdateEvent(ev.id, 'event_type', e.target.value)}>
                          <option value="shot">SHOT</option>
                          <option value="key_pass">KEY PASS</option>
                          <option value="assist">ASSIST</option>
                        </select>
                      </td>
                      {/* OUTCOME */}
                      <td style={s}>
                        <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "2px 4px", color: ev.shot_outcome === 'goal' ? '#16a34a' : 'inherit' }} value={ev.shot_outcome || ""} onChange={e => handleUpdateEvent(ev.id, 'shot_outcome', e.target.value || null)}>
                          <option value="">—</option>
                          <option value="goal">GOAL</option>
                          <option value="target">ON TARGET</option>
                          <option value="blocked">BLOCKED</option>
                          <option value="miss">MISS</option>
                        </select>
                      </td>
                      {/* BODY PART */}
                      <td style={s}>
                        <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "2px 4px" }} value={ev.body_part || ""} onChange={e => handleUpdateEvent(ev.id, 'body_part', e.target.value || null)}>
                          <option value="">—</option>
                          <option value="right_foot">RIGHT FOOT</option>
                          <option value="left_foot">LEFT FOOT</option>
                          <option value="head">HEAD</option>
                        </select>
                      </td>
                      {/* DIRECTION — from acting team's perspective */}
                      <td style={s}>
                        {(() => {
                          const isAway = ev.action_team === selectedMatch?.away_team;
                          const displayDir = isAway ? flipDir(ev.home_team_direction || 'L2R') : (ev.home_team_direction || 'L2R');
                          return (
                            <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "2px 4px" }} value={displayDir}
                              onChange={e => {
                                const homeDir = isAway ? flipDir(e.target.value) : e.target.value;
                                handleUpdateEvent(ev.id, 'home_team_direction', homeDir);
                              }}>
                              <option value="L2R">→ L2R</option>
                              <option value="R2L">← R2L</option>
                            </select>
                          );
                        })()}
                      </td>
                      {/* REACTION PLAYER */}
                      <td style={s}>
                        <select className="brutal-select" style={{ fontSize: "0.65rem", padding: "2px 4px", maxWidth: 130 }} value={ev.reaction_player_id || ""} onChange={e => handleUpdateEvent(ev.id, 'reaction_player_id', e.target.value)}>
                          <option value="">— GK / TARGET —</option>
                          {teamSheet.map(p => (
                            <option key={p.id} value={p.id}>{p.jersey_number} {p.player_name} ({p.team_name?.split(' ')[0]})</option>
                          ))}
                        </select>
                      </td>
                      {/* DELETE */}
                      <td style={{ ...s, textAlign: "right" }}>
                        <button onClick={() => handleDeleteEvent(ev.id)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", fontWeight: 900 }}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreateModal && <MatchModal onSave={handleCreateMatch} onCancel={() => setShowCreateModal(false)} />}
      <style jsx>{`
        .timeline-row:hover { background: #f9fffe !important; }
        .timeline-row select, .timeline-row input { background: transparent; }
        .timeline-row:hover select, .timeline-row:hover input { background: #fff; }
      `}</style>
    </div>
  );
}
