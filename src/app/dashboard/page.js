"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import YouTube from "react-youtube";

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLOR_OPP   = "#0277B6"; // Next opponent (selected team)
const COLOR_OTHER = "#D90429"; // Opposition of opponent

// ─── Symbol helpers ───────────────────────────────────────────────────────────
function getEventSymbol(ev) {
  if (ev.event_type === "key_pass" || ev.event_type === "assist") return null; // circle
  if (ev.shot_outcome === "goal")    return "⚽";
  if (ev.shot_outcome === "target")  return "★";
  if (ev.shot_outcome === "miss")    return "+";
  if (ev.shot_outcome === "blocked") return "✕";
  return null;
}

function getOutcomeLabel(ev) {
  if (ev.event_type === "key_pass" || ev.event_type === "assist") return "SUCCESSFUL";
  if (!ev.shot_outcome) return "—";
  const map = { goal: "GOAL ⚽", target: "ON TARGET ★", miss: "MISS +", blocked: "BLOCKED ✕" };
  return map[ev.shot_outcome] || ev.shot_outcome.toUpperCase();
}

// Flip x for R2L display
const flipX = (x) => x != null ? 120 - x : null;
const flipY = (y) => y != null ? 80  - y : null;

// ─── Heatmap grid builder ─────────────────────────────────────────────────────
const HCOLS = 24, HROWS = 16;
const CW = 120 / HCOLS, CH = 80 / HROWS;
function buildHeatGrid(events) {
  const g = Array.from({ length: HROWS }, () => Array(HCOLS).fill(0));
  events.forEach(ev => {
    if (ev.start_x == null || ev.start_y == null) return;
    const c = Math.min(Math.floor(ev.start_x / CW), HCOLS - 1);
    const r = Math.min(Math.floor(ev.start_y / CH), HROWS - 1);
    g[r][c]++;
  });
  return g;
}

// ─── Scouting Pitch ───────────────────────────────────────────────────────────
function ScoutingPitch({ events, selectedEventId, onEventClick, selectedTeam, heatmapMode }) {
  const R = 1.8;
  const oppEvents = events.filter(e => e.isNextOpponent);
  const heatGrid  = heatmapMode ? buildHeatGrid(oppEvents) : null;
  const maxHeat   = heatGrid ? Math.max(1, ...heatGrid.flat()) : 1;

  return (
    <div className="brutal-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>⚽ SCOUTING MAP</span>
        <div style={{ display: "flex", gap: 14, fontSize: "0.62rem" }}>
          <span style={{ color: COLOR_OPP   }}>■ {selectedTeam || "NEXT OPP"} (L→R)</span>
          <span style={{ color: COLOR_OTHER }}>■ OPPOSITION (R→L)</span>
          <span>⚽ Goal</span><span>★ On Target</span><span>+ Miss</span><span>✕ Blocked</span><span>○ Pass</span>
        </div>
      </div>
      <div style={{ background: "#fff", position: "relative", aspectRatio: "3/2" }}>
        <svg viewBox="-3 -1 126 82" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="xMidYMid meet">
          {/* Grass */}
          <rect x="0" y="0" width="120" height="80" fill="#f8f8f8" />

          {/* Goals */}
          <rect x="-2.44" y="36.34" width="2.44" height="7.32" fill="#fff" stroke="#000" strokeWidth="0.3" />
          <rect x="120"   y="36.34" width="2.44" height="7.32" fill="#fff" stroke="#000" strokeWidth="0.3" />

          {/* Pitch lines — black */}
          <rect x="0" y="0" width="120" height="80" fill="none" stroke="#000" strokeWidth="0.5" />
          <line x1="60" y1="0" x2="60" y2="80" stroke="#000" strokeWidth="0.5" />
          <circle cx="60" cy="40" r="9.15" fill="none" stroke="#000" strokeWidth="0.5" />
          <circle cx="60" cy="40" r="0.4" fill="#000" />
          {/* Left box */}
          <rect x="0" y="19.85" width="16.5" height="40.3" fill="none" stroke="#000" strokeWidth="0.5" />
          <rect x="0" y="30.85" width="5.5"  height="18.3" fill="none" stroke="#000" strokeWidth="0.5" />
          <circle cx="11" cy="40" r="0.4" fill="#000" />
          <path d="M 16.5 32.7 A 9.15 9.15 0 0 1 16.5 47.3" fill="none" stroke="#000" strokeWidth="0.5" />
          {/* Right box */}
          <rect x="103.5" y="19.85" width="16.5" height="40.3" fill="none" stroke="#000" strokeWidth="0.5" />
          <rect x="114.5" y="30.85" width="5.5"  height="18.3" fill="none" stroke="#000" strokeWidth="0.5" />
          <circle cx="109" cy="40" r="0.4" fill="#000" />
          <path d="M 103.5 32.7 A 9.15 9.15 0 0 0 103.5 47.3" fill="none" stroke="#000" strokeWidth="0.5" />

          {/* Heatmap overlay */}
          {heatmapMode && heatGrid && heatGrid.map((row, ri) =>
            row.map((cnt, ci) => cnt === 0 ? null : (
              <rect key={`${ri}-${ci}`}
                x={ci * CW} y={ri * CH} width={CW} height={CH}
                fill={COLOR_OPP}
                fillOpacity={Math.min(0.85, 0.1 + 0.75 * (cnt / maxHeat))}
                rx="0.3"
              />
            ))
          )}

          {/* Events — hidden in heatmap mode */}
          {!heatmapMode && events.map((ev, i) => {
            const isNextOpp = ev.isNextOpponent;
            const color = isNextOpp ? COLOR_OPP : COLOR_OTHER;
            const isSelected = selectedEventId === ev.id;
            const symbol = getEventSymbol(ev);
            const isPass = !symbol;

            // Opposition events are displayed as R2L (flip coords for display only)
            const sx = isNextOpp ? ev.start_x : flipX(ev.start_x);
            const sy = isNextOpp ? ev.start_y : flipY(ev.start_y);
            const ex = isNextOpp ? ev.end_x   : flipX(ev.end_x);
            const ey = isNextOpp ? ev.end_y   : flipY(ev.end_y);
            const r = isSelected ? R * 1.4 : R;

            return (
              <g key={i} onClick={() => onEventClick && onEventClick(ev)} style={{ cursor: "pointer" }}>
                {/* Line when selected */}
                {isSelected && ex != null && ey != null && (
                  <>
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth="0.8" strokeDasharray="2,1" />
                    <circle cx={ex} cy={ey} r="0.6" fill={color} />
                  </>
                )}
                {isPass ? (
                  /* Pass/Assist = open circle */
                  <circle cx={sx} cy={sy} r={r} fill="none" stroke={color} strokeWidth={isSelected ? 0.7 : 0.5} />
                ) : (
                  /* Shot = filled circle + symbol text */
                  <>
                    <circle cx={sx} cy={sy} r={r} fill={color} fillOpacity={isSelected ? 1 : 0.85} stroke={isSelected ? "#000" : "none"} strokeWidth="0.3" />
                    <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central"
                      fontSize={r * 1.4}
                      fill="#fff"
                      style={{ userSelect: "none", pointerEvents: "none" }}>
                      {symbol}
                    </text>
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

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [matches, setMatches]           = useState([]);
  const [normalizedEvents, setNormalizedEvents] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [activeEvent, setActiveEvent]   = useState(null);
  const [loading, setLoading]           = useState(true);

  const [filterAction,   setFilterAction]   = useState("all");
  const [filterOutcome,  setFilterOutcome]  = useState("all");
  const [filterOpponent, setFilterOpponent] = useState("all");
  const [heatmapMode,    setHeatmapMode]    = useState(false);

  const [teamSheets, setTeamSheets] = useState([]);

  const ytPlayerRef     = useRef(null);
  const videoRef        = useRef(null);
  const [activeVideoLink, setActiveVideoLink] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("opp_matches").select("*").order("match_date", { ascending: false });
      setMatches(data || []);
      setLoading(false);
    })();
  }, []);

  const allTeams = useMemo(() => {
    const set = new Set(matches.flatMap(m => [m.home_team, m.away_team]));
    return Array.from(set).sort();
  }, [matches]);

  const teamMatches = useMemo(() => {
    if (!selectedTeam) return [];
    return matches.filter(m => m.home_team === selectedTeam || m.away_team === selectedTeam);
  }, [selectedTeam, matches]);

  useEffect(() => {
    setSelectedMatchIds(teamMatches.map(m => m.id));
    setFilterOpponent("all");
  }, [teamMatches]);

  const previousOpponents = useMemo(() =>
    teamMatches.map(m => m.home_team === selectedTeam ? m.away_team : m.home_team)
      .filter((v, i, a) => a.indexOf(v) === i).sort(),
    [teamMatches, selectedTeam]);

  useEffect(() => {
    if (selectedMatchIds.length === 0) { setNormalizedEvents([]); setTeamSheets([]); return; }
    (async () => {
      const [evRes, tsRes] = await Promise.all([
        supabase.from("normalized_highlight_events").select("*").in("match_id", selectedMatchIds).order("created_at", { ascending: true }),
        supabase.from("team_sheets").select("*").in("match_id", selectedMatchIds),
      ]);
      setNormalizedEvents(evRes.data || []);
      setTeamSheets(tsRes.data || []);
    })();
  }, [selectedMatchIds]);

  const enrichedEvents = useMemo(() =>
    normalizedEvents.map(ev => ({ ...ev, isNextOpponent: ev.action_team === selectedTeam })),
    [normalizedEvents, selectedTeam]);

  const filteredEvents = useMemo(() => enrichedEvents.filter(ev => {
    if (filterAction !== "all" && ev.event_type !== filterAction) return false;
    if (filterOutcome !== "all") {
      if (filterOutcome === "successful" && ev.shot_outcome != null) return false;
      if (filterOutcome !== "successful" && ev.shot_outcome !== filterOutcome) return false;
    }
    if (filterOpponent !== "all") {
      const match = matches.find(m => m.id === ev.match_id);
      if (!match) return false;
      const opp = match.home_team === selectedTeam ? match.away_team : match.home_team;
      if (opp !== filterOpponent) return false;
    }
    return true;
  }), [enrichedEvents, filterAction, filterOutcome, filterOpponent, matches, selectedTeam]);

  const stats = useMemo(() => {
    const opp = filteredEvents.filter(e => e.isNextOpponent);
    return {
      shots:  opp.filter(e => e.event_type === "shot").length,
      goals:  opp.filter(e => e.shot_outcome === "goal").length,
      passes: opp.filter(e => e.event_type !== "shot").length,
      total:  opp.length,
    };
  }, [filteredEvents]);

  // Player contribution stats
  const playerStats = useMemo(() => {
    const playerMap = Object.fromEntries(teamSheets.map(p => [p.id, p]));
    const oppEvents = filteredEvents.filter(e => e.isNextOpponent && e.action_player_id);
    const byPlayer = {};
    oppEvents.forEach(ev => {
      const pid = ev.action_player_id;
      if (!byPlayer[pid]) byPlayer[pid] = { player: playerMap[pid], shots: 0, goals: 0, key_pass: 0, assist: 0 };
      if (ev.event_type === "shot")     byPlayer[pid].shots++;
      if (ev.shot_outcome === "goal")   byPlayer[pid].goals++;
      if (ev.event_type === "key_pass") byPlayer[pid].key_pass++;
      if (ev.event_type === "assist")   byPlayer[pid].assist++;
    });
    return Object.values(byPlayer).sort((a, b) => (b.shots + b.goals + b.key_pass + b.assist) - (a.shots + a.goals + a.key_pass + a.assist));
  }, [filteredEvents, teamSheets]);


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

  const handleMatchToggle = (matchId) =>
    setSelectedMatchIds(prev => prev.includes(matchId) ? prev.filter(id => id !== matchId) : [...prev, matchId]);

  let youtubeId = null;
  if (activeVideoLink) {
    const m = activeVideoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (m) youtubeId = m[1];
  }

  const selStyle = { fontSize: "0.7rem", padding: "4px 8px" };

  return (
    <div style={{ minHeight: "calc(100vh - 80px)", paddingBottom: 100, background: "#f5f5f5" }}>

      {/* ─── FILTER BAR ─── */}
      <div style={{ background: "#FACC15", border: "3px solid #000", borderTop: "none", borderLeft: "none", borderRight: "none", padding: "10px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>

        <label style={{ fontWeight: 900, fontSize: "0.75rem" }}>NEXT OPPONENT:</label>
        <select className="brutal-select" style={{ minWidth: 180 }} value={selectedTeam} onChange={e => { setSelectedTeam(e.target.value); setActiveEvent(null); }}>
          <option value="">— SELECT TEAM —</option>
          {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {previousOpponents.length > 0 && (
          <>
            <label style={{ fontWeight: 800, fontSize: "0.7rem" }}>VS:</label>
            <select className="brutal-select" style={selStyle} value={filterOpponent} onChange={e => setFilterOpponent(e.target.value)}>
              <option value="all">ALL OPPONENTS</option>
              {previousOpponents.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </>
        )}

        <label style={{ fontWeight: 800, fontSize: "0.7rem" }}>ACTION:</label>
        <select className="brutal-select" style={selStyle} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="all">ALL</option>
          <option value="shot">SHOTS</option>
          <option value="key_pass">KEY PASSES</option>
          <option value="assist">ASSISTS</option>
        </select>

        <label style={{ fontWeight: 800, fontSize: "0.7rem" }}>OUTCOME:</label>
        <select className="brutal-select" style={selStyle} value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}>
          <option value="all">ALL</option>
          <option value="goal">⚽ GOAL</option>
          <option value="target">★ ON TARGET</option>
          <option value="miss">+ MISS</option>
          <option value="blocked">✕ BLOCKED</option>
          <option value="successful">○ SUCCESSFUL</option>
        </select>

        <button onClick={() => setHeatmapMode(h => !h)} className="brutal-btn"
          style={{ background: heatmapMode ? COLOR_OPP : "#fff", color: heatmapMode ? "#fff" : "#000", fontSize: "0.7rem", padding: "4px 12px", fontWeight: 800, border: `2px solid ${COLOR_OPP}` }}>
          {heatmapMode ? "🔥 HEAT" : "○ MAP"}
        </button>

        {teamMatches.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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

        {selectedTeam && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontWeight: 900, fontSize: "0.75rem" }}>
            <span style={{ color: COLOR_OPP }}>⚽ {stats.goals}</span>
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
            <div style={{ color: "#666", fontSize: "0.8rem", marginTop: 6 }}>All scouted matches will appear here</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontWeight: 800 }}>⚠️ NO DATA</div>
            <div style={{ color: "#666", fontSize: "0.8rem", marginTop: 6 }}>Tag highlights then click <b>✓ FINISH HIGHLIGHT</b> in the Tagger.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16, alignItems: "start" }}>

            {/* LEFT: PITCH */}
            <div>
              <ScoutingPitch
                events={filteredEvents}
                selectedEventId={activeEvent?.id}
                onEventClick={handleEventClick}
                selectedTeam={selectedTeam}
                heatmapMode={heatmapMode}
              />

              <div className="brutal-card" style={{ marginTop: 10, padding: "8px 12px", display: "flex", gap: 20, fontSize: "0.68rem", flexWrap: "wrap", alignItems: "center" }}>
                <span><span style={{ color: COLOR_OPP,   fontWeight: 900 }}>■</span> {selectedTeam} — L→R</span>
                <span><span style={{ color: COLOR_OTHER, fontWeight: 900 }}>■</span> Opposition — R→L</span>
                <span style={{ marginLeft: "auto", color: "#999" }}>Click event → seek video</span>
              </div>

              <div className="brutal-card" style={{ marginTop: 10, padding: 10 }}>
                <div style={{ fontWeight: 800, fontSize: "0.7rem", marginBottom: 6 }}>MATCHES</div>
                {teamMatches.filter(m => selectedMatchIds.includes(m.id)).map(m => {
                  const cnt = filteredEvents.filter(e => e.match_id === m.id && e.isNextOpponent).length;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", padding: "4px 6px", background: "#f9f9f9", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700 }}>{m.home_team} vs {m.away_team}</span>
                      <span style={{ color: "#666" }}>{cnt} events from {selectedTeam}</span>
                    </div>
                  );
                })}
              </div>

              {/* Player Contribution */}
              {playerStats.length > 0 && (
                <div className="brutal-card" style={{ marginTop: 10, padding: 0, overflow: "hidden" }}>
                  <div style={{ background: COLOR_OPP, color: "#fff", padding: "5px 10px", fontWeight: 800, fontSize: "0.65rem" }}>PLAYER CONTRIBUTIONS — {selectedTeam}</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.68rem" }}>
                      <thead>
                        <tr style={{ background: "#f0f0f0", borderBottom: "2px solid #000" }}>
                          <th style={{ padding: "4px 8px", textAlign: "left" }}>#</th>
                          <th style={{ padding: "4px 8px", textAlign: "left" }}>PLAYER</th>
                          <th style={{ padding: "4px 8px", textAlign: "center", color: COLOR_OPP }}>SH</th>
                          <th style={{ padding: "4px 8px", textAlign: "center", color: "#16a34a" }}>G</th>
                          <th style={{ padding: "4px 8px", textAlign: "center" }}>KP</th>
                          <th style={{ padding: "4px 8px", textAlign: "center" }}>AST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerStats.map((ps, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #eee", background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                            <td style={{ padding: "4px 8px", color: "#999", fontWeight: 700 }}>{ps.player?.jersey_number || "—"}</td>
                            <td style={{ padding: "4px 8px", fontWeight: 600 }}>{ps.player?.player_name || "Unknown"}</td>
                            <td style={{ padding: "4px 8px", textAlign: "center", fontWeight: ps.shots > 0 ? 700 : 400, color: ps.shots > 0 ? COLOR_OPP : "#aaa" }}>{ps.shots || "—"}</td>
                            <td style={{ padding: "4px 8px", textAlign: "center", fontWeight: ps.goals > 0 ? 800 : 400, color: ps.goals > 0 ? "#16a34a" : "#aaa" }}>{ps.goals || "—"}</td>
                            <td style={{ padding: "4px 8px", textAlign: "center", color: ps.key_pass > 0 ? "#000" : "#aaa" }}>{ps.key_pass || "—"}</td>
                            <td style={{ padding: "4px 8px", textAlign: "center", color: ps.assist > 0 ? "#000" : "#aaa" }}>{ps.assist || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: VIDEO + LOG */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "calc(100vh - 140px)", position: "sticky", top: 12 }}>
              <div className="brutal-card" style={{ overflow: "hidden", flexShrink: 0 }}>
                <div style={{ background: "#000", color: "#fff", padding: "6px 12px", fontWeight: 800, fontSize: "0.7rem", display: "flex", justifyContent: "space-between" }}>
                  <span>📹 VIDEO</span>
                  {activeEvent && <span style={{ color: "#FACC15" }}>{activeEvent.timestamp} — {activeEvent.event_type?.replace("_", " ").toUpperCase()}</span>}
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

              {activeEvent && (
                <div className="brutal-card" style={{ padding: 10, borderLeft: `4px solid ${activeEvent.isNextOpponent ? COLOR_OPP : COLOR_OTHER}`, flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.7rem", marginBottom: 6 }}>SELECTED EVENT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: "0.68rem" }}>
                    <div><span style={{ color: "#666" }}>TEAM</span><br/><b style={{ color: activeEvent.isNextOpponent ? COLOR_OPP : COLOR_OTHER }}>{activeEvent.action_team}</b></div>
                    <div><span style={{ color: "#666" }}>ACTION</span><br/><b>{activeEvent.event_type?.replace("_", " ").toUpperCase()}</b></div>
                    <div><span style={{ color: "#666" }}>OUTCOME</span><br/><b style={{ color: activeEvent.shot_outcome === "goal" ? "#16a34a" : "inherit" }}>{getOutcomeLabel(activeEvent)}</b></div>
                    <div><span style={{ color: "#666" }}>HALF</span><br/><b>{activeEvent.half || "—"}</b></div>
                    <div><span style={{ color: "#666" }}>BODY PART</span><br/><b>{activeEvent.body_part?.replace("_", " ").toUpperCase() || "—"}</b></div>
                    <div><span style={{ color: "#666" }}>TIME</span><br/><b>{activeEvent.timestamp}</b></div>
                  </div>
                </div>
              )}

              {/* EVENT LOG — fills all remaining height */}
              <div className="brutal-card" style={{ padding: 0, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ background: COLOR_OPP, color: "#fff", padding: "5px 10px", fontWeight: 800, fontSize: "0.65rem", flexShrink: 0 }}>
                  {selectedTeam} — EVENT LOG ({filteredEvents.filter(e => e.isNextOpponent).length})
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {filteredEvents.filter(e => e.isNextOpponent).map((ev, i) => (
                    <div key={i} onClick={() => handleEventClick(ev)}
                      style={{ padding: "6px 10px", borderBottom: "1px solid #eee", cursor: "pointer", fontSize: "0.68rem",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: activeEvent?.id === ev.id ? "#e8f4fd" : "transparent" }}>
                      <span style={{ fontWeight: 700, width: 36, color: COLOR_OPP }}>{ev.timestamp}</span>
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
