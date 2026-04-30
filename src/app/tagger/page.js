"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import YouTube from "react-youtube";
import HighlightTaggerPitch from "@/components/HighlightTaggerPitch";
import HighlightModal from "@/components/HighlightModal";
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

  // ─── Load matches ───
  useEffect(() => {
    loadMatches();
  }, []);

  // ─── Create match ───
  const handleCreateMatch = async (form) => {
    setLoading(true);
    // Force hilight true for all matches now
    const { data, error } = await supabase
      .from("opp_matches")
      .insert([{ ...form, hilight: true }])
      .select()
      .single();
    if (!error && data) {
      await loadMatches();
      setSelectedMatchId(data.id);
    }
    setShowCreateModal(false);
    setLoading(false);
  };

  // ─── Edit match ───
  const handleEditMatch = async (form) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("opp_matches")
      .update(form)
      .eq("id", selectedMatchId)
      .select()
      .single();
    if (!error && data) {
      await loadMatches();
      setSelectedMatch(data);
    }
    setShowEditModal(false);
    setLoading(false);
  };

  // ─── Load events and team sheet when match changes ───
  useEffect(() => {
    if (!selectedMatchId) {
      setEvents([]);
      setTeamSheet([]);
      setSelectedMatch(null);
      return;
    }
    const match = matches.find((m) => m.id === selectedMatchId);
    setSelectedMatch(match);
    
    // Load Events
    supabase
      .from("highlight_events")
      .select("*")
      .eq("match_id", selectedMatchId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setEvents(data || []));

    // Load Team Sheet
    supabase
      .from("team_sheets")
      .select("*")
      .eq("match_id", selectedMatchId)
      .then(({ data }) => setTeamSheet(data || []));

  }, [selectedMatchId, matches]);

  const handlePitchInteraction = (startX, startY, endX, endY) => {
    setActiveEventData({ startX, startY, endX, endY });
  };

  const handleSaveEvent = async (formData) => {
    if (!selectedMatchId || !activeEventData) return;

    let currentTime = timestamp;
    let timeInSeconds = null;

    if (videoRef.current) {
      timeInSeconds = videoRef.current.currentTime;
    } else if (ytPlayerRef.current) {
      const ytTime = ytPlayerRef.current.getCurrentTime();
      if (ytTime) timeInSeconds = ytTime;
    }

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
      ...formData
    };

    const { data, error } = await supabase
      .from("highlight_events")
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      setEvents((prev) => [...prev, data]);
    }
    setActiveEventData(null);
  };

  const handleDeleteEvent = async (id) => {
    const { error } = await supabase.from("highlight_events").delete().eq("id", id);
    if (!error) {
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
    }
  };

  const handleSeek = (timestamp) => {
    if (!timestamp) return;
    const parts = timestamp.split(':');
    if (parts.length < 2) return;
    const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    
    if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(seconds, true);
    } else if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  // ─── Filtered Events for Timeline ───
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (filterTeam !== "all" && ev.team_type !== filterTeam) return false;
      if (filterPlayer !== "all" && ev.action_player_id !== filterPlayer) return false;
      if (filterAction !== "all" && ev.event_type !== filterAction) return false;
      if (filterOutcome !== "all") {
        if (filterOutcome === "goal" && ev.shot_outcome !== "goal") return false;
        if (filterOutcome === "miss" && ev.shot_outcome === "goal") return false; // Simple logic
      }
      return true;
    });
  }, [events, filterTeam, filterPlayer, filterAction, filterOutcome]);

  if (!authChecked) return null;

  // Video ID logic
  let youtubeId = null;
  let videoLink = selectedMatch?.video_link;
  if (videoLink) {
    const ytMatch = videoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (ytMatch) youtubeId = ytMatch[1];
  }

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto", paddingBottom: 120 }}>
      {/* ─── TOP CONTROL BAR ─── */}
      <div style={{ background: "#34D399", border: "3px solid #000", boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>MATCH:</label>
          <select className="brutal-select" value={selectedMatchId} onChange={(e) => setSelectedMatchId(e.target.value)} style={{ minWidth: 260 }}>
            <option value="">— SELECT MATCH —</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.home_team} VS {m.away_team}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCreateModal(true)} className="brutal-btn" style={{ background: "#000", color: "#FACC15", fontSize: "0.75rem" }}>
            + NEW MATCH
          </button>
          {selectedMatchId && (
            <button onClick={() => setShowEditModal(true)} className="brutal-btn" style={{ background: "#fff", color: "#000", fontSize: "0.75rem", border: "2px solid #000" }}>
              ✎ EDIT MATCH
            </button>
          )}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {/* Direction toggle */}
          <div style={{ display: "flex", gap: 0 }}>
            {["L2R", "R2L"].map((d) => (
              <button key={d} onClick={() => setDirection(d)} className="brutal-btn" style={{ background: direction === d ? "#000" : "#fff", color: direction === d ? "#34D399" : "#000", fontSize: "0.75rem", padding: "6px 14px", boxShadow: direction === d ? "2px 2px 0 0 rgba(0,0,0,1)" : "none" }}>
                {d === "L2R" ? "→ L2R" : "← R2L"}
              </button>
            ))}
          </div>
          {/* Timestamp */}
          <input className="brutal-input" style={{ width: 90 }} value={timestamp} onChange={(e) => setTimestamp(e.target.value)} placeholder="MM:SS" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16 }}>
        {/* LEFT COLUMN: Video & Tagger */}
        <div>
          <div className="brutal-card" style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem" }}>
              📹 VIDEO PLAYER
            </div>
            <div style={{ aspectRatio: "16/9", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!selectedMatch ? (
                <p style={{ color: "#666", fontSize: "0.8rem" }}>SELECT A MATCH TO BEGIN</p>
              ) : youtubeId ? (
                <YouTube
                  videoId={youtubeId}
                  opts={{ width: "100%", height: "100%", playerVars: { autoplay: 0, rel: 0, modestbranding: 1 } }}
                  onReady={(e) => { ytPlayerRef.current = e.target; }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : videoLink ? (
                <video ref={videoRef} src={videoLink} controls style={{ width: "100%", height: "100%" }} />
              ) : (
                <p style={{ color: "#666", fontSize: "0.8rem" }}>NO VIDEO LINK PROVIDED</p>
              )}
            </div>
          </div>
          
          {/* Tool Selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => setTool("shot")} className="brutal-btn" style={{ flex: 1, background: tool === "shot" ? "#000" : "#fff", color: tool === "shot" ? "#34D399" : "#000" }}>
              🎯 SHOT TOOL (1 Click)
            </button>
            <button onClick={() => setTool("pass")} className="brutal-btn" style={{ flex: 1, background: tool === "pass" ? "#000" : "#fff", color: tool === "pass" ? "#FACC15" : "#000" }}>
              ↗️ PASS TOOL (2 Clicks)
            </button>
          </div>

          <HighlightTaggerPitch 
            events={events}
            tool={tool}
            onEventComplete={handlePitchInteraction}
            onEventClick={(ev) => handleSeek(ev.timestamp)}
          />
        </div>

        {/* RIGHT COLUMN: Team Sheet & Event Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {selectedMatch && <TeamSheetManager matchId={selectedMatchId} />}

          {/* Event Log / Timeline */}
          <div className="brutal-card" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 400 }}>
            <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem" }}>
              📋 EVENT TIMELINE
            </div>
            
            {/* TIMELINE FILTERS */}
            <div style={{ padding: 8, background: "#f9f9f9", borderBottom: "2px solid #000", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 4px" }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
                <option value="all">ALL TEAMS</option>
                <option value="focus_team">HOME</option>
                <option value="opponent">AWAY</option>
              </select>
              <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 4px" }} value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}>
                <option value="all">ALL PLAYERS</option>
                {teamSheet.map(p => (
                  <option key={p.id} value={p.id}>{p.jersey_number} {p.player_name}</option>
                ))}
              </select>
              <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 4px" }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                <option value="all">ALL ACTIONS</option>
                <option value="shot">SHOTS</option>
                <option value="key_pass">KEY PASSES</option>
                <option value="assist">ASSISTS</option>
              </select>
              <select className="brutal-select" style={{ fontSize: "0.6rem", padding: "2px 4px" }} value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}>
                <option value="all">ALL OUTCOMES</option>
                <option value="goal">GOALS</option>
                <option value="miss">OTHER</option>
              </select>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>
              {filteredEvents.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "#666", textAlign: "center", padding: 32 }}>NO MATCHING EVENTS</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f0f0f0", borderBottom: "2px solid #000", zIndex: 1 }}>
                    <tr style={{ color: "#666", fontWeight: 700 }}>
                      <th style={{ padding: "8px 4px", textAlign: "left", width: 40 }}>TIME</th>
                      <th style={{ padding: "8px 4px", textAlign: "left", width: 20 }}>T</th>
                      <th style={{ padding: "8px 4px", textAlign: "left" }}>PLAYER</th>
                      <th style={{ padding: "8px 4px", textAlign: "left" }}>ACTION</th>
                      <th style={{ padding: "8px 4px", textAlign: "left" }}>OUT</th>
                      <th style={{ padding: "8px 4px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((ev) => {
                      const player = teamSheet.find(p => p.id === ev.action_player_id);
                      return (
                        <tr 
                          key={ev.id} 
                          onClick={() => handleSeek(ev.timestamp)}
                          className="timeline-row"
                          style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                        >
                          <td style={{ padding: "8px 4px", fontWeight: 800 }}>{ev.timestamp || "0'"}</td>
                          <td style={{ padding: "8px 4px" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.team_type === 'focus_team' ? '#34D399' : '#F87171' }}></div>
                          </td>
                          <td style={{ padding: "8px 4px", fontWeight: 600 }}>
                            {player ? `${player.jersey_number} ${player.player_name.toUpperCase()}` : "—"}
                          </td>
                          <td style={{ padding: "8px 4px" }}>{ev.event_type.replace("_", " ").toUpperCase()}</td>
                          <td style={{ padding: "8px 4px", fontWeight: 700, color: ev.shot_outcome === "goal" ? "#34D399" : "#000" }}>
                            {ev.shot_outcome ? ev.shot_outcome.toUpperCase() : "SUCCESSFUL"}
                          </td>
                          <td style={{ padding: "8px 4px", textAlign: "right" }}>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id); }} style={{ color: "#ccc", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {activeEventData && (
        <HighlightModal 
          tool={tool}
          teamSheet={teamSheet}
          onSave={handleSaveEvent}
          onCancel={() => setActiveEventData(null)}
        />
      )}

      {showCreateModal && (
        <MatchModal
          onSave={handleCreateMatch}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && selectedMatch && (
        <MatchModal
          initialData={selectedMatch}
          onSave={handleEditMatch}
          onCancel={() => setShowEditModal(false)}
        />
      )}

      <style jsx>{`
        .timeline-row:hover {
          background: #eee;
        }
      `}</style>
    </div>
  );
}
