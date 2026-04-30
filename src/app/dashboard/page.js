"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import YouTube from "react-youtube";

// ─── Symbol & colour helpers ──────────────────────────────────────────────────
function getEventSymbol(ev) {
  if (ev.event_type === "key_pass" || ev.event_type === "assist") return "○";
  if (ev.shot_outcome === "goal")    return "⚽";
  if (ev.shot_outcome === "target")  return "★";
  if (ev.shot_outcome === "miss")    return "+";
  if (ev.shot_outcome === "blocked") return "✕";
  return "○"; // fallback
}

function getOutcomeLabel(ev) {
  if (ev.event_type === "key_pass" || ev.event_type === "assist") return "SUCCESSFUL";
  if (!ev.shot_outcome) return "—";
  const map = { goal: "GOAL ⚽", target: "ON TARGET ★", miss: "MISS +", blocked: "BLOCKED ✕" };
  return map[ev.shot_outcome] || ev.shot_outcome.toUpperCase();
}

// ─── Pitch Legend ─────────────────────────────────────────────────────────────
const LEGEND = [
  { sym: "⚽", label: "Goal" },
  { sym: "★", label: "On Target" },
  { sym: "+", label: "Miss" },
  { sym: "✕", label: "Blocked" },
  { sym: "○", label: "Pass / Assist" },
];

// ─── Scouting Pitch ───────────────────────────────────────────────────────────
function ScoutingPitch({ events, selectedEventId, onEventClick }) {
  return (
    <div className="brutal-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>⚽ SCOUTING MAP</span>
        <div style={{ display: "flex", gap: 12, fontSize: "0.6rem" }}>
          <span style={{ color: "#34D399" }}>■ NEXT OPP</span>
          <span style={{ color: "#F87171" }}>■ OTHERS</span>
          {LEGEND.map(l => <span key={l.sym}>{l.sym} {l.label}</span>)}
        </div>
      </div>
      <div style={{ background: "#2D5A27", position: "relative", aspectRatio: "3/2" }}>
        <svg viewBox="-3 -1 126 82" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="xMidYMid meet">
          {/* Grass */}
          <rect x="0" y="0" width="120" height="80" fill="#2D5A27" />
          {/* Goals */}
          <rect x="-2.44" y="36.34" width="2.44" height="7.32" fill="#fff" stroke="#000" strokeWidth="0.2" />
          <rect x="120"  y="36.34" width="2.44" height="7.32" fill="#fff" stroke="#000" strokeWidth="0.2" />
          {/* Pitch lines */}
          <rect x="0" y="0" width="120" height="80" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <line x1="60" y1="0" x2="60" y2="80" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <circle cx="60" cy="40" r="9.15" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <circle cx="60" cy="40" r="0.4" fill="rgba(255,255,255,0.8)" />
          {/* Left box */}
          <rect x="0" y="19.85" width="16.5" height="40.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <rect x="0" y="30.85" width="5.5"  height="18.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <circle cx="11" cy="40" r="0.4" fill="rgba(255,255,255,0.8)" />
          <path d="M 16.5 32.7 A 9.15 9.15 0 0 1 16.5 47.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          {/* Right box */}
          <rect x="103.5" y="19.85" width="16.5" height="40.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <rect x="114.5" y="30.85" width="5.5"  height="18.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <circle cx="109" cy="40" r="0.4" fill="rgba(255,255,255,0.8)" />
          <path d="M 103.5 32.7 A 9.15 9.15 0 0 0 103.5 47.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />

          {/* Events */}
          {events.map((ev, i) => {
            const isSelected = selectedEventId === ev.id;
            const color = ev.isNextOpponent ? "#34D399" : "#F87171";
            const symbol = getEventSymbol(ev);
            const isPass = ev.event_type === "key_pass" || ev.event_type === "assist";
            return (
              <g key={i} onClick={() => onEventClick && onEventClick(ev)} style={{ cursor: "pointer" }}>
                {/* Vector line when selected */}
                {isSelected && ev.end_x != null && ev.end_y != null && (
                  <>
                    <line x1={ev.start_x} y1={ev.start_y} x2={ev.end_x} y2={ev.end_y} stroke={color} strokeWidth="0.8" strokeDasharray="2,1" />
                    <circle cx={ev.end_x} cy={ev.end_y} r="0.6" fill={color} />
                  </>
                )}
                {/* Pass = open circle, others = emoji/symbol text */}
                {isPass ? (
                  <circle
                    cx={ev.start_x} cy={ev.start_y}
                    r={isSelected ? 2.2 : 1.6}
                    fill="none" stroke={color} strokeWidth={isSelected ? 0.8 : 0.5}
                    fillOpacity="0.9"
                  />
                ) : (
                  <text
                    x={ev.start_x} y={ev.start_y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={isSelected ? "4" : "3"}
                    style={{ userSelect: "none", filter: isSelected ? "drop-shadow(0 0 1px #fff)" : "none" }}
                  >
                    {symbol}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [matches, setMatches]             = useState([]);
  const [normalizedEvents, setNormalizedEvents] = useState([]);
  const [selectedTeam, setSelectedTeam]   = useState("");
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [activeEvent, setActiveEvent]     = useState(null);
  const [loading, setLoading]             = useState(true);

  // Filters
  const [filterAction,    setFilterAction]    = useState("all");
  const [filterOutcome,   setFilterOutcome]   = useState("all");
  const [filterOpponent,  setFilterOpponent]  = useState("all");

  const ytPlayerRef     = useRef(null);
  const videoRef        = useRef(null);
  const [activeVideoLink, setActiveVideoLink] = useState(null);

  // Load all matches
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("opp_matches").select("*").order("match_date", { ascending: false });
      setMatches(data || []);
      setLoading(false);
    })();
  }, []);

  // All unique team names for selector
  const allTeams = useMemo(() => {
    const set = new Set(matches.flatMap(m => [m.home_team, m.away_team]));
    return Array.from(set).sort();
  }, [matches]);

  // Matches involving selected team
  const teamMatches = useMemo(() => {
    if (!selectedTeam) return [];
    return matches.filter(m => m.home_team === selectedTeam || m.away_team === selectedTeam);
  }, [selectedTeam, matches]);

  // Auto-select all matches when team changes
  useEffect(() => {
    setSelectedMatchIds(teamMatches.map(m => m.id));
    setFilterOpponent("all");
  }, [teamMatches]);

  // Unique previous opponents of selected team
  const previousOpponents = useMemo(() => {
    return teamMatches.map(m =>
      m.home_team === selectedTeam ? m.away_team : m.home_team
    ).filter((v, i, a) => a.indexOf(v) === i).sort();
  }, [teamMatches, selectedTeam]);

  // Load normalized events
  useEffect(() => {
    if (selectedMatchIds.length === 0) { setNormalizedEvents([]); return; }
    (async () => {
      const { data } = await supabase
        .from("normalized_highlight_events")
        .select("*")
        .in("match_id", selectedMatchIds)
        .order("created_at", { ascending: true });
      setNormalizedEvents(data || []);
    })();
  }, [selectedMatchIds]);

  // Enrich with flags
  const enrichedEvents = useMemo(() => {
    return normalizedEvents.map(ev => ({
      ...ev,
      isNextOpponent: ev.action_team === selectedTeam,
    }));
  }, [normalizedEvents, selectedTeam]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return enrichedEvents.filter(ev => {
      if (filterAction !== "all" && ev.event_type !== filterAction) return false;
      if (filterOutcome !== "all") {
        if (filterOutcome === "successful" && ev.shot_outcome != null) return false;
        if (filterOutcome !== "successful" && ev.shot_outcome !== filterOutcome) return false;
      }
      if (filterOpponent !== "all") {
        // Find the match and check the opposing team
        const match = matches.find(m => m.id === ev.match_id);
        if (!match) return false;
        const opponentInMatch = match.home_team === selectedTeam ? match.away_team : match.home_team;
        if (opponentInMatch !== filterOpponent) return false;
      }
      return true;
    });
  }, [enrichedEvents, filterAction, filterOutcome, filterOpponent, matches, selectedTeam]);

  // Stats
  const stats = useMemo(() => {
    const opp = filteredEvents.filter(e => e.isNextOpponent);
    return {
      shots:   opp.filter(e => e.event_type === "shot").length,
      goals:   opp.filter(e => e.shot_outcome === "goal").length,
      passes:  opp.filter(e => e.event_type !== "shot").length,
      total:   opp.length,
    };
  }, [filteredEvents]);

  const handleEventClick = (ev) => {
    setActiveEvent(ev);
    setActiveVideoLink(ev.video_link || null);
    if (!ev.timestamp) return;
    const parts = ev.timestamp.split(":");
    const seconds = Math.max(0, parseInt(parts[0]) * 60 + parseInt(parts[1]) - 5);
    setTimeout(() => {
      if (ytPlayerRef.current) ytPlayerRef.current.seekTo(seconds, true);
      else if (videoRef.current) { videoRef.current.currentTime = seconds; videoRef.current.play(); }
    }, 300);
  };

  const handleMatchToggle = (matchId) => {
    setSelectedMatchIds(prev =>
      prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId]
    );
  };

  let youtubeId = null;
  if (activeVideoLink) {
    const m = activeVideoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (m) youtubeId = m[1];
  }

  const selStyle = { fontSize: "0.7rem", padding: "4px 8px" };

  return (
    <div style={{ minHeight: "calc(100vh - 80px)", paddingBottom: 100 }}>

      {/* ─── FILTER BAR ─── */}
      <div style={{ background: "#FACC15", border: "3px solid #000", borderTop: "none", borderLeft: "none", borderRight: "none", padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>

        {/* Team selector */}
        <label style={{ fontWeight: 900, fontSize: "0.75rem" }}>NEXT OPPONENT:</label>
        <select className="brutal-select" style={{ minWidth: 180 }} value={selectedTeam} onChange={e => { setSelectedTeam(e.target.value); setActiveEvent(null); }}>
          <option value="">— SELECT TEAM —</option>
          {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Previous opponent filter */}
        {previousOpponents.length > 0 && (
          <>
            <label style={{ fontWeight: 800, fontSize: "0.7rem" }}>VS:</label>
            <select className="brutal-select" style={selStyle} value={filterOpponent} onChange={e => setFilterOpponent(e.target.value)}>
              <option value="all">ALL OPPONENTS</option>
              {previousOpponents.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </>
        )}

        {/* Action filter */}
        <label style={{ fontWeight: 800, fontSize: "0.7rem" }}>ACTION:</label>
        <select className="brutal-select" style={selStyle} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="all">ALL</option>
          <option value="shot">SHOTS</option>
          <option value="key_pass">KEY PASSES</option>
          <option value="assist">ASSISTS</option>
        </select>

        {/* Outcome filter */}
        <label style={{ fontWeight: 800, fontSize: "0.7rem" }}>OUTCOME:</label>
        <select className="brutal-select" style={selStyle} value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}>
          <option value="all">ALL</option>
          <option value="goal">⚽ GOAL</option>
          <option value="target">★ ON TARGET</option>
          <option value="miss">+ MISS</option>
          <option value="blocked">✕ BLOCKED</option>
          <option value="successful">○ SUCCESSFUL (PASSES)</option>
        </select>

        {/* Match toggles */}
        {teamMatches.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginLeft: 4 }}>
            {teamMatches.map(m => {
              const isSelected = selectedMatchIds.includes(m.id);
              return (
                <button key={m.id} onClick={() => handleMatchToggle(m.id)} className="brutal-btn"
                  style={{ fontSize: "0.6rem", padding: "3px 8px", background: isSelected ? "#000" : "#fff", color: isSelected ? "#FACC15" : "#000" }}>
                  {m.home_team} vs {m.away_team}
                </button>
              );
            })}
          </div>
        )}

        {/* Stats */}
        {selectedTeam && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontWeight: 900, fontSize: "0.75rem" }}>
            <span>⚽ {stats.goals}</span>
            <span>SHOTS {stats.shots}</span>
            <span>PASSES {stats.passes}</span>
            <span>TOTAL {stats.total}</span>
          </div>
        )}
      </div>

      <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
        {loading ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center" }}>LOADING...</div>
        ) : !selectedTeam ? (
          <div className="brutal-card" style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem" }}>📊</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", marginTop: 8 }}>SELECT YOUR NEXT OPPONENT</div>
            <div style={{ color: "#666", fontSize: "0.8rem", marginTop: 6 }}>Choose a team to view all scouting data across matches</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem" }}>⚠️</div>
            <div style={{ fontWeight: 800 }}>NO DATA</div>
            <div style={{ color: "#666", fontSize: "0.8rem", marginTop: 6 }}>
              Tag highlights then click <b>✓ FINISH HIGHLIGHT</b> in the Tagger to process data for <b>{selectedTeam}</b>.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16 }}>

            {/* LEFT: PITCH */}
            <div>
              <ScoutingPitch events={filteredEvents} selectedEventId={activeEvent?.id} onEventClick={handleEventClick} />

              {/* Legend row */}
              <div className="brutal-card" style={{ marginTop: 10, padding: "8px 12px", display: "flex", gap: 20, fontSize: "0.7rem", flexWrap: "wrap" }}>
                <span><span style={{ color: "#34D399", fontWeight: 900 }}>■</span> {selectedTeam} (L→R)</span>
                <span><span style={{ color: "#F87171", fontWeight: 900 }}>■</span> Opposition (R→L)</span>
                {LEGEND.map(l => <span key={l.sym}>{l.sym} = {l.label}</span>)}
                <span style={{ marginLeft: "auto", color: "#999" }}>Click dot → seek video</span>
              </div>

              {/* Matches breakdown */}
              <div className="brutal-card" style={{ marginTop: 10, padding: 10 }}>
                <div style={{ fontWeight: 800, fontSize: "0.7rem", marginBottom: 6 }}>MATCHES IN VIEW</div>
                {teamMatches.filter(m => selectedMatchIds.includes(m.id)).map(m => {
                  const cnt = filteredEvents.filter(e => e.match_id === m.id && e.isNextOpponent).length;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", padding: "4px 6px", background: "#f9f9f9", borderRadius: 3, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700 }}>{m.home_team} vs {m.away_team}</span>
                      <span style={{ color: "#666" }}>{cnt} events from {selectedTeam}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: VIDEO + EVENT LOG */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Video */}
              <div className="brutal-card" style={{ overflow: "hidden" }}>
                <div style={{ background: "#000", color: "#fff", padding: "6px 12px", fontWeight: 800, fontSize: "0.7rem", display: "flex", justifyContent: "space-between" }}>
                  <span>📹 VIDEO</span>
                  {activeEvent && <span style={{ color: "#FACC15" }}>{activeEvent.timestamp} — {getEventSymbol(activeEvent)} {activeEvent.event_type?.replace("_", " ").toUpperCase()}</span>}
                </div>
                <div style={{ aspectRatio: "16/9", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {!activeVideoLink ? (
                    <p style={{ color: "#555", fontSize: "0.7rem" }}>CLICK AN EVENT TO WATCH</p>
                  ) : youtubeId ? (
                    <YouTube key={youtubeId} videoId={youtubeId}
                      opts={{ width: "100%", height: "100%", playerVars: { autoplay: 1, rel: 0, modestbranding: 1 } }}
                      onReady={e => { ytPlayerRef.current = e.target; }}
                      style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <video ref={videoRef} key={activeVideoLink} src={activeVideoLink} controls style={{ width: "100%", height: "100%" }} />
                  )}
                </div>
              </div>

              {/* Active event detail */}
              {activeEvent && (
                <div className="brutal-card" style={{ padding: 10, borderLeft: `4px solid ${activeEvent.isNextOpponent ? "#34D399" : "#F87171"}` }}>
                  <div style={{ fontWeight: 800, fontSize: "0.7rem", marginBottom: 6 }}>SELECTED EVENT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: "0.68rem" }}>
                    <div><span style={{ color: "#666" }}>TEAM</span><br/><b>{activeEvent.action_team}</b></div>
                    <div><span style={{ color: "#666" }}>ACTION</span><br/><b>{getEventSymbol(activeEvent)} {activeEvent.event_type?.replace("_", " ").toUpperCase()}</b></div>
                    <div><span style={{ color: "#666" }}>OUTCOME</span><br/><b style={{ color: activeEvent.shot_outcome === "goal" ? "#16a34a" : "inherit" }}>{getOutcomeLabel(activeEvent)}</b></div>
                    <div><span style={{ color: "#666" }}>HALF</span><br/><b>{activeEvent.half || "—"}</b></div>
                    <div><span style={{ color: "#666" }}>BODY PART</span><br/><b>{activeEvent.body_part?.replace("_", " ").toUpperCase() || "—"}</b></div>
                    <div><span style={{ color: "#666" }}>TIME</span><br/><b>{activeEvent.timestamp}</b></div>
                  </div>
                </div>
              )}

              {/* Event log */}
              <div className="brutal-card" style={{ padding: 0, overflow: "hidden", flex: 1 }}>
                <div style={{ background: "#000", color: "#34D399", padding: "5px 10px", fontWeight: 800, fontSize: "0.65rem" }}>
                  {selectedTeam} — EVENT LOG ({filteredEvents.filter(e => e.isNextOpponent).length})
                </div>
                <div style={{ overflowY: "auto", maxHeight: 280 }}>
                  {filteredEvents.filter(e => e.isNextOpponent).map((ev, i) => (
                    <div key={i} onClick={() => handleEventClick(ev)}
                      style={{ padding: "6px 10px", borderBottom: "1px solid #eee", cursor: "pointer", fontSize: "0.68rem",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: activeEvent?.id === ev.id ? "#f0fdf4" : "transparent" }}>
                      <span style={{ fontWeight: 700, width: 36 }}>{ev.timestamp}</span>
                      <span style={{ flex: 1 }}>{ev.event_type?.replace("_", " ").toUpperCase()}</span>
                      <span style={{ color: ev.shot_outcome === "goal" ? "#16a34a" : "#555", fontWeight: ev.shot_outcome === "goal" ? 800 : 400 }}>
                        {getOutcomeLabel(ev)}
                      </span>
                      <span style={{ color: "#aaa", marginLeft: 8 }}>{ev.half || ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
