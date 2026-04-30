"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import YouTube from "react-youtube";

// ─── Full Pitch Component (inline for Dashboard) ───────────────────────────
function ScoutingPitch({ events, selectedEventId, onEventClick }) {
  return (
    <div className="brutal-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>⚽ SCOUTING MAP</span>
        <div style={{ display: "flex", gap: 16, fontSize: "0.65rem" }}>
          <span style={{ color: "#34D399" }}>● NEXT OPPONENT</span>
          <span style={{ color: "#F87171" }}>● OTHER TEAMS</span>
        </div>
      </div>
      <div style={{ background: "#2D5A27", position: "relative", aspectRatio: "3/2" }}>
        <svg viewBox="-3 -1 126 82" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="xMidYMid meet">
          {/* Pitch grass */}
          <rect x="0" y="0" width="120" height="80" fill="#2D5A27" />

          {/* ── GOAL POSTS ── */}
          <rect x="-2.44" y="36.34" width="2.44" height="7.32" fill="#fff" stroke="#000" strokeWidth="0.2" />
          <rect x="120" y="36.34" width="2.44" height="7.32" fill="#fff" stroke="#000" strokeWidth="0.2" />

          {/* Pitch outline */}
          <rect x="0" y="0" width="120" height="80" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <line x1="60" y1="0" x2="60" y2="80" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <circle cx="60" cy="40" r="9.15" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <circle cx="60" cy="40" r="0.4" fill="rgba(255,255,255,0.8)" />
          {/* Left box */}
          <rect x="0" y="19.85" width="16.5" height="40.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <rect x="0" y="30.85" width="5.5" height="18.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <circle cx="11" cy="40" r="0.4" fill="rgba(255,255,255,0.8)" />
          <path d="M 16.5 32.7 A 9.15 9.15 0 0 1 16.5 47.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          {/* Right box */}
          <rect x="103.5" y="19.85" width="16.5" height="40.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <rect x="114.5" y="30.85" width="5.5" height="18.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          <circle cx="109" cy="40" r="0.4" fill="rgba(255,255,255,0.8)" />
          <path d="M 103.5 32.7 A 9.15 9.15 0 0 0 103.5 47.3" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />

          {/* Events */}
          {events.map((ev, i) => {
            const isSelected = selectedEventId === ev.id;
            const isOpponent = ev.isNextOpponent;
            const color = isOpponent ? "#34D399" : "#F87171";
            return (
              <g key={i} onClick={() => onEventClick && onEventClick(ev)} style={{ cursor: "pointer" }}>
                <circle cx={ev.start_x} cy={ev.start_y} r={isSelected ? 2 : 1.5} fill={color} stroke={isSelected ? "#FFF" : "#000"} strokeWidth={isSelected ? 0.8 : 0.3} fillOpacity="0.85" />
                {isSelected && ev.end_x != null && ev.end_y != null && (
                  <>
                    <line x1={ev.start_x} y1={ev.start_y} x2={ev.end_x} y2={ev.end_y} stroke={color} strokeWidth="1" strokeDasharray="2,2" />
                    <circle cx={ev.end_x} cy={ev.end_y} r="0.8" fill={color} />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [matches, setMatches] = useState([]);
  const [normalizedEvents, setNormalizedEvents] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const ytPlayerRef = useRef(null);
  const videoRef = useRef(null);
  const [activeVideoLink, setActiveVideoLink] = useState(null);

  // Load all matches
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("opp_matches")
        .select("*")
        .order("match_date", { ascending: false });
      setMatches(data || []);
      setLoading(false);
    })();
  }, []);

  // Distinct teams from normalized events
  const allOpponentTeams = useMemo(() => {
    const set = new Set(matches.flatMap(m => [m.home_team, m.away_team]));
    return Array.from(set).sort();
  }, [matches]);

  // Matches involving the selected team as an opponent
  const teamMatches = useMemo(() => {
    if (!selectedTeam) return [];
    return matches.filter(m => m.home_team === selectedTeam || m.away_team === selectedTeam);
  }, [selectedTeam, matches]);

  useEffect(() => {
    setSelectedMatchIds(teamMatches.map(m => m.id));
  }, [teamMatches]);

  // Load normalized events for all team matches
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

  // Enrich events with isNextOpponent flag
  const enrichedEvents = useMemo(() => {
    return normalizedEvents.map(ev => ({
      ...ev,
      isNextOpponent: ev.action_team === selectedTeam,
    }));
  }, [normalizedEvents, selectedTeam]);

  // Stats
  const stats = useMemo(() => {
    const opponentEvents = enrichedEvents.filter(e => e.isNextOpponent);
    const shots = opponentEvents.filter(e => e.event_type === "shot");
    const goals = shots.filter(e => e.shot_outcome === "goal");
    const passes = opponentEvents.filter(e => e.event_type !== "shot");
    return { total: opponentEvents.length, shots: shots.length, goals: goals.length, passes: passes.length };
  }, [enrichedEvents]);

  const handleEventClick = (ev) => {
    setActiveEvent(ev);
    // Switch to the match's video
    setActiveVideoLink(ev.video_link || null);
    // Seek
    if (!ev.timestamp) return;
    const parts = ev.timestamp.split(':');
    let seconds = Math.max(0, parseInt(parts[0]) * 60 + parseInt(parts[1]) - 5);
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
    const ytMatch = activeVideoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (ytMatch) youtubeId = ytMatch[1];
  }

  return (
    <div style={{ minHeight: "calc(100vh - 80px)", paddingBottom: 100 }}>
      {/* ─── FILTER BAR ─── */}
      <div style={{ background: "#FACC15", border: "3px solid #000", borderTop: "none", borderLeft: "none", borderRight: "none", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <label style={{ fontWeight: 900, fontSize: "0.75rem" }}>NEXT OPPONENT:</label>
        <select className="brutal-select" style={{ minWidth: 200 }} value={selectedTeam} onChange={e => { setSelectedTeam(e.target.value); setActiveEvent(null); }}>
          <option value="">— SELECT TEAM —</option>
          {allOpponentTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {teamMatches.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {teamMatches.map(m => {
              const isSelected = selectedMatchIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => handleMatchToggle(m.id)}
                  className="brutal-btn"
                  style={{ fontSize: "0.65rem", padding: "4px 10px", background: isSelected ? "#000" : "#fff", color: isSelected ? "#FACC15" : "#000" }}
                >
                  {m.home_team} vs {m.away_team}
                </button>
              );
            })}
          </div>
        )}

        {selectedTeam && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontWeight: 800, fontSize: "0.75rem" }}>
            <span>SHOTS: {stats.shots}</span>
            <span>GOALS: {stats.goals}</span>
            <span>PASSES: {stats.passes}</span>
            <span>TOTAL: {stats.total}</span>
          </div>
        )}
      </div>

      <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
        {loading ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center" }}>LOADING...</div>
        ) : !selectedTeam ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>📊</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>SELECT YOUR NEXT OPPONENT</div>
            <div style={{ color: "#666", fontSize: "0.8rem", marginTop: 8 }}>Choose a team to view all scouting data across multiple matches</div>
          </div>
        ) : enrichedEvents.length === 0 ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 800 }}>NO NORMALIZED DATA</div>
            <div style={{ color: "#666", fontSize: "0.8rem", marginTop: 8 }}>
              Tag highlights for matches involving <b>{selectedTeam}</b>, then click <b>"✓ FINISH HIGHLIGHT"</b> in the Tagger to process the data.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16 }}>
            {/* LEFT: PITCH */}
            <div>
              <ScoutingPitch
                events={enrichedEvents}
                selectedEventId={activeEvent?.id}
                onEventClick={handleEventClick}
              />

              {/* Event Legend */}
              <div className="brutal-card" style={{ marginTop: 12, padding: 12, display: "flex", gap: 24, fontSize: "0.7rem" }}>
                <div><span style={{ color: "#34D399", fontWeight: 900 }}>●</span> <b>{selectedTeam}</b> events (L→R)</div>
                <div><span style={{ color: "#F87171", fontWeight: 900 }}>●</span> Opposition events (R→L)</div>
                <div style={{ marginLeft: "auto", color: "#666" }}>Click any dot to seek video</div>
              </div>

              {/* Matches breakdown */}
              <div className="brutal-card" style={{ marginTop: 12, padding: 12 }}>
                <div style={{ fontWeight: 800, fontSize: "0.75rem", marginBottom: 8 }}>MATCHES IN VIEW</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {teamMatches.filter(m => selectedMatchIds.includes(m.id)).map(m => {
                    const matchEvents = enrichedEvents.filter(e => e.match_id === m.id);
                    const opEvents = matchEvents.filter(e => e.isNextOpponent);
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", padding: "6px 8px", background: "#f9f9f9", borderRadius: 4 }}>
                        <span style={{ fontWeight: 700 }}>{m.home_team} vs {m.away_team}</span>
                        <span style={{ color: "#666" }}>{opEvents.length} events from {selectedTeam}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: VIDEO + EVENT LOG */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Video Player */}
              <div className="brutal-card" style={{ overflow: "hidden" }}>
                <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.7rem", display: "flex", justifyContent: "space-between" }}>
                  <span>📹 VIDEO REPLAY</span>
                  {activeEvent && <span style={{ color: "#FACC15" }}>{activeEvent.timestamp}</span>}
                </div>
                <div style={{ aspectRatio: "16/9", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {!activeVideoLink ? (
                    <p style={{ color: "#666", fontSize: "0.7rem" }}>CLICK AN EVENT TO WATCH</p>
                  ) : youtubeId ? (
                    <YouTube
                      key={youtubeId}
                      videoId={youtubeId}
                      opts={{ width: "100%", height: "100%", playerVars: { autoplay: 1, rel: 0, modestbranding: 1 } }}
                      onReady={e => { ytPlayerRef.current = e.target; }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <video ref={videoRef} key={activeVideoLink} src={activeVideoLink} controls style={{ width: "100%", height: "100%" }} />
                  )}
                </div>
              </div>

              {/* Active Event Detail */}
              {activeEvent && (
                <div className="brutal-card" style={{ padding: 12, borderLeft: `4px solid ${activeEvent.isNextOpponent ? "#34D399" : "#F87171"}` }}>
                  <div style={{ fontWeight: 800, fontSize: "0.75rem", marginBottom: 8 }}>SELECTED EVENT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: "0.7rem" }}>
                    <div><span style={{ color: "#666" }}>TEAM</span><br/><b>{activeEvent.action_team}</b></div>
                    <div><span style={{ color: "#666" }}>ACTION</span><br/><b>{activeEvent.event_type?.replace("_", " ").toUpperCase()}</b></div>
                    <div><span style={{ color: "#666" }}>OUTCOME</span><br/><b>{activeEvent.shot_outcome?.toUpperCase() || "—"}</b></div>
                    <div><span style={{ color: "#666" }}>HALF</span><br/><b>{activeEvent.half || "—"}</b></div>
                    <div><span style={{ color: "#666" }}>BODY PART</span><br/><b>{activeEvent.body_part?.replace("_", " ").toUpperCase() || "—"}</b></div>
                    <div><span style={{ color: "#666" }}>TIME</span><br/><b>{activeEvent.timestamp}</b></div>
                  </div>
                </div>
              )}

              {/* Event list for selected team */}
              <div className="brutal-card" style={{ padding: 0, overflow: "hidden", flex: 1 }}>
                <div style={{ background: "#000", color: "#34D399", padding: "6px 12px", fontWeight: 800, fontSize: "0.65rem" }}>
                  {selectedTeam.toUpperCase()} — EVENT LOG ({enrichedEvents.filter(e => e.isNextOpponent).length})
                </div>
                <div style={{ overflowY: "auto", maxHeight: 300 }}>
                  {enrichedEvents.filter(e => e.isNextOpponent).map((ev, i) => (
                    <div
                      key={i}
                      onClick={() => handleEventClick(ev)}
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid #eee",
                        cursor: "pointer",
                        fontSize: "0.7rem",
                        display: "flex",
                        justifyContent: "space-between",
                        background: activeEvent?.id === ev.id ? "#f0fdf4" : "transparent"
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{ev.timestamp}</span>
                      <span>{ev.event_type?.replace("_", " ").toUpperCase()}</span>
                      <span style={{ color: ev.shot_outcome === "goal" ? "#34D399" : "#666" }}>{ev.shot_outcome?.toUpperCase() || "SUCCESS"}</span>
                      <span style={{ color: "#999" }}>{ev.half || ""}</span>
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
