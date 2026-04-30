"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import YouTube from "react-youtube";
import HighlightTaggerPitch from "@/components/HighlightTaggerPitch";
import HighlightModal from "@/components/HighlightModal";
import TeamSheetManager from "@/components/TeamSheetManager";
import MatchModal from "@/components/MatchModal";

export default function HighlightsTaggerPage() {
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
      .eq("hilight", true)
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
          <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>HIGHLIGHT MATCH:</label>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* LEFT COLUMN: Video & Team Sheet */}
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
                  opts={{ width: "100%", height: "100%", playerVars: { autoplay: 0, rel: 0 } }}
                  onReady={(e) => { ytPlayerRef.current = e.target; }}
                  className="w-full h-full"
                  iframeClassName="w-full h-full"
                />
              ) : videoLink ? (
                <video ref={videoRef} src={videoLink} controls style={{ width: "100%", height: "100%" }} />
              ) : (
                <p style={{ color: "#666", fontSize: "0.8rem" }}>NO VIDEO LINK PROVIDED</p>
              )}
            </div>
          </div>
          
          {selectedMatch && <TeamSheetManager matchId={selectedMatchId} />}
        </div>

        {/* RIGHT COLUMN: Tagger Pitch & Event List */}
        <div>
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
          />

          {/* Event Log */}
          <div className="brutal-card" style={{ marginTop: 16 }}>
            <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem" }}>
              📋 LOGGED HIGHLIGHTS
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto", padding: 8 }}>
              {events.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "#666", textAlign: "center", padding: 16 }}>NO EVENTS YET</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {events.map((ev) => (
                    <li key={ev.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ccc", padding: "6px 0", fontSize: "0.8rem" }}>
                      <span>
                        <strong style={{ color: ev.team_type === 'focus_team' ? '#34D399' : '#F87171' }}>{ev.team_type}</strong> | {ev.timestamp || "00:00"} | {ev.event_type} {ev.shot_outcome ? `(${ev.shot_outcome})` : ""}
                      </span>
                      <button onClick={() => handleDeleteEvent(ev.id)} style={{ color: "red", fontWeight: 800 }}>✕</button>
                    </li>
                  ))}
                </ul>
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
    </div>
  );
}
