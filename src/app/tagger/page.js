"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import GridPitch from "@/components/GridPitch";
import CoordinatePitch from "@/components/CoordinatePitch";
import ShotOutcomeModal from "@/components/ShotOutcomeModal";
import MatchModal from "@/components/MatchModal";
import EventLog from "@/components/EventLog";

export default function TaggerPage() {
  // ─── State ───
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [half, setHalf] = useState(1);
  const [direction, setDirection] = useState("L2R");
  const [timestamp, setTimestamp] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShotModal, setShowShotModal] = useState(null); // { eventType, x, y }
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const videoRef = useRef(null);
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

  // ─── Load matches ───
  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    const { data } = await supabase
      .from("opp_matches")
      .select("*")
      .order("created_at", { ascending: false });
    setMatches(data || []);
  };

  // ─── Load events when match changes ───
  useEffect(() => {
    if (!selectedMatchId) {
      setEvents([]);
      setSelectedMatch(null);
      return;
    }
    const match = matches.find((m) => m.id === selectedMatchId);
    setSelectedMatch(match);
    loadEvents(selectedMatchId);
  }, [selectedMatchId, matches]);

  const loadEvents = async (matchId) => {
    const { data } = await supabase
      .from("opp_raw_events")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    setEvents(data || []);
  };

  // ─── Create match ───
  const handleCreateMatch = async (form) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("opp_matches")
      .insert([form])
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

  // ─── Log event ───
  const logEvent = useCallback(
    async (eventData) => {
      if (!selectedMatchId) return;
      const payload = {
        match_id: selectedMatchId,
        half,
        home_team_direction: direction,
        timestamp,
        ...eventData,
      };
      const { data, error } = await supabase
        .from("opp_raw_events")
        .insert([payload])
        .select()
        .single();
      if (!error && data) {
        setEvents((prev) => [...prev, data]);
      }
    },
    [selectedMatchId, half, direction, timestamp]
  );

  // ─── Zone click handlers ───
  const handleGainBall = (col, row) => {
    logEvent({
      event_type: "gain_ball",
      zone_col: col,
      zone_row: row,
      location_x: (col - 0.5) * 10,
      location_y: (row - 0.5) * 10,
    });
  };

  const handleLoseBall = (col, row) => {
    logEvent({
      event_type: "lose_ball",
      zone_col: col,
      zone_row: row,
      location_x: (col - 0.5) * 10,
      location_y: (row - 0.5) * 10,
    });
  };

  // ─── Shot click handlers ───
  const handleShotTaken = (x, y) => {
    setShowShotModal({ eventType: "shot_taken", x, y });
  };

  const handleShotConceded = (x, y) => {
    setShowShotModal({ eventType: "shot_conceded", x, y });
  };

  const handleShotOutcome = (outcome) => {
    if (!showShotModal) return;
    logEvent({
      event_type: showShotModal.eventType,
      location_x: showShotModal.x,
      location_y: showShotModal.y,
      shot_outcome: outcome,
    });
    setShowShotModal(null);
  };

  // ─── Delete event ───
  const handleDeleteEvent = async (eventId) => {
    await supabase.from("opp_raw_events").delete().eq("id", eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  // ─── Video embed helper ───
  const getYoutubeId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  const videoLink = selectedMatch?.video_link || "";
  const youtubeId = getYoutubeId(videoLink);

  // ─── Filter events by type ───
  const gainEvents = events.filter((e) => e.event_type === "gain_ball");
  const loseEvents = events.filter((e) => e.event_type === "lose_ball");
  const shotTakenEvents = events.filter((e) => e.event_type === "shot_taken");
  const shotConcededEvents = events.filter((e) => e.event_type === "shot_conceded");

  if (!authChecked) return null; // Prevent flicker before redirect

  return (
    <div style={{ padding: 16, background: "var(--color-bg)", minHeight: "calc(100vh - 80px)" }}>
      {/* ─── MATCH SELECTOR BAR ─── */}
      <div style={{ background: "#FACC15", border: "3px solid #000", boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 800 }}>MATCH:</label>
          <select className="brutal-select" value={selectedMatchId} onChange={(e) => setSelectedMatchId(e.target.value)} style={{ minWidth: 260 }}>
            <option value="">— SELECT MATCH —</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.home_team} VS {m.away_team} ({m.score_home}-{m.score_away})
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
          {/* Half toggle */}
          <div style={{ display: "flex", gap: 0 }}>
            {[1, 2].map((h) => (
              <button key={h} onClick={() => setHalf(h)} className="brutal-btn" style={{ background: half === h ? "#000" : "#fff", color: half === h ? "#FACC15" : "#000", fontSize: "0.75rem", padding: "6px 14px", boxShadow: half === h ? "2px 2px 0 0 rgba(0,0,0,1)" : "none" }}>
                {h}H
              </button>
            ))}
          </div>
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

      {/* ─── MAIN LAYOUT ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* LEFT: Video Player */}
        <div>
          <div className="brutal-card" style={{ overflow: "hidden", marginBottom: 16 }}>
            <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem" }}>
              📹 VIDEO PLAYER
            </div>
            <div style={{ aspectRatio: "16/9", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!selectedMatch ? (
                <p style={{ color: "#666", fontSize: "0.8rem" }}>SELECT A MATCH TO BEGIN</p>
              ) : youtubeId ? (
                <iframe
                  width="100%" height="100%"
                  src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ border: "none" }}
                />
              ) : videoLink ? (
                <video ref={videoRef} src={videoLink} controls style={{ width: "100%", height: "100%" }} />
              ) : (
                <p style={{ color: "#666", fontSize: "0.8rem" }}>NO VIDEO LINK PROVIDED</p>
              )}
            </div>
          </div>
          {/* Event Log */}
          <EventLog events={events} onDelete={handleDeleteEvent} />
        </div>

        {/* RIGHT: 4 Pitches (2×2 grid) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <GridPitch title="⬆ GAIN BALL" events={gainEvents} onZoneClick={selectedMatchId ? handleGainBall : undefined} colorScheme="teal" mode={selectedMatchId ? "tagger" : "heatmap"} />
          <GridPitch title="⬇ LOSE BALL" events={loseEvents} onZoneClick={selectedMatchId ? handleLoseBall : undefined} colorScheme="orange" mode={selectedMatchId ? "tagger" : "heatmap"} />
          <CoordinatePitch title="🎯 SHOTS TAKEN" events={shotTakenEvents} onPitchClick={selectedMatchId ? handleShotTaken : undefined} mode={selectedMatchId ? "tagger" : "display"} />
          <CoordinatePitch title="🛡 SHOTS CONCEDED" events={shotConcededEvents} onPitchClick={selectedMatchId ? handleShotConceded : undefined} mode={selectedMatchId ? "tagger" : "display"} />
        </div>
      </div>

      {/* ─── MODALS ─── */}
      {showCreateModal && <MatchModal onSave={handleCreateMatch} onCancel={() => setShowCreateModal(false)} />}
      {showEditModal && <MatchModal initialData={selectedMatch} onSave={handleEditMatch} onCancel={() => setShowEditModal(false)} />}
      {showShotModal && <ShotOutcomeModal position={{ x: showShotModal.x, y: showShotModal.y }} onSelect={handleShotOutcome} onCancel={() => setShowShotModal(null)} />}
    </div>
  );
}
