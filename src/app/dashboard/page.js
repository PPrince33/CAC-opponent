"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeHighlightEvents } from "@/lib/normalize";
import DangerPitch from "@/components/DangerPitch";
import FilterBar from "@/components/FilterBar";
import YouTube from "react-youtube";

export default function DashboardPage() {
  const [matches, setMatches] = useState([]);
  const [highlightEvents, setHighlightEvents] = useState([]);
  const [teamSheets, setTeamSheets] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const ytPlayerRef = useRef(null);
  const videoRef = useRef(null);

  // ─── Load all matches ───
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

  // ─── Distinct team names ───
  const teams = useMemo(() => {
    const set = new Set();
    matches.forEach((m) => {
      set.add(m.home_team);
      set.add(m.away_team);
    });
    return Array.from(set).sort();
  }, [matches]);

  // ─── Matches involving selected team ───
  const teamMatches = useMemo(() => {
    if (!selectedTeam) return [];
    return matches.filter(
      (m) => m.home_team === selectedTeam || m.away_team === selectedTeam
    );
  }, [selectedTeam, matches]);

  // ─── Auto-select all matches when team changes ───
  useEffect(() => {
    setSelectedMatchIds(teamMatches.map((m) => m.id));
  }, [teamMatches]);

  // ─── Load events for selected matches ───
  useEffect(() => {
    if (selectedMatchIds.length === 0) {
      setHighlightEvents([]);
      setTeamSheets([]);
      return;
    }
    (async () => {
      const { data: hlData } = await supabase
        .from("highlight_events")
        .select("*")
        .in("match_id", selectedMatchIds)
        .order("created_at", { ascending: true });
      setHighlightEvents(hlData || []);

      const { data: tsData } = await supabase
        .from("team_sheets")
        .select("*")
        .in("match_id", selectedMatchIds);
      setTeamSheets(tsData || []);
    })();
  }, [selectedMatchIds]);

  const handleMatchToggle = (matchId) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId]
    );
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

  // ─── Normalize events ───
  const splitHighlights = useMemo(() => {
    if (!selectedTeam) return [];
    const result = [];
    highlightEvents.forEach((ev) => {
      const match = matches.find((m) => m.id === ev.match_id);
      if (!match) return;
      
      const normalized = normalizeHighlightEvents([ev], selectedTeam, match);
      normalized.forEach(n => {
        // Shift "Opponent" actions to left half, "Focus" to right half
        if (n.team_type === 'opponent') {
          // Map 0-120 -> 0-60
          n.start_x = n.start_x / 2;
          if (n.end_x != null) n.end_x = n.end_x / 2;
        } else {
          // Map 0-120 -> 60-120
          n.start_x = 60 + (n.start_x / 2);
          if (n.end_x != null) n.end_x = 60 + (n.end_x / 2);
        }
        result.push(n);
      });
    });
    return result;
  }, [highlightEvents, selectedTeam, matches]);

  // Video for the MOST RECENT selected match
  const selectedMatch = useMemo(() => {
    if (selectedMatchIds.length === 0) return null;
    return matches.find(m => m.id === selectedMatchIds[0]);
  }, [selectedMatchIds, matches]);

  let youtubeId = null;
  let videoLink = selectedMatch?.video_link;
  if (videoLink) {
    const ytMatch = videoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (ytMatch) youtubeId = ytMatch[1];
  }

  return (
    <div style={{ minHeight: "calc(100vh - 80px)", paddingBottom: 100 }}>
      <FilterBar
        teams={teams}
        selectedTeam={selectedTeam}
        onTeamChange={setSelectedTeam}
        matches={teamMatches}
        selectedMatches={selectedMatchIds}
        onMatchToggle={handleMatchToggle}
      />

      <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
        {loading ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center" }}>LOADING...</div>
        ) : !selectedTeam ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center" }}>SELECT A TEAM ABOVE</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Left: Pitch Map */}
            <div>
              <DangerPitch
                title={`📊 ${selectedTeam} ANALYSIS (LEFT: AGAINST | RIGHT: FOR)`}
                events={splitHighlights}
                teamSheet={teamSheets}
                onEventClick={(ev) => handleSeek(ev.timestamp)}
              />
            </div>

            {/* Right: Video Player & Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
               <div className="brutal-card" style={{ overflow: "hidden" }}>
                  <div style={{ background: "#000", color: "#fff", padding: "8px 12px", fontWeight: 800, fontSize: "0.75rem", display: "flex", justifyContent: "space-between" }}>
                    <span>📹 VIDEO REPLAY</span>
                    {selectedMatch && <span style={{ color: "#FACC15" }}>{selectedMatch.home_team} VS {selectedMatch.away_team}</span>}
                  </div>
                  <div style={{ aspectRatio: "16/9", background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selectedMatchIds.length === 0 ? (
                      <p style={{ color: "#666", fontSize: "0.7rem" }}>SELECT A MATCH TO WATCH</p>
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
                      <p style={{ color: "#666", fontSize: "0.7rem" }}>NO VIDEO LINK</p>
                    )}
                  </div>
               </div>

               <div className="brutal-card" style={{ padding: 12 }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.8rem" }}>HOW TO USE:</h4>
                  <p style={{ fontSize: "0.7rem", margin: 0, color: "#666" }}>
                    • Click on any event on the pitch map to jump the video to that moment.<br/>
                    • The <b>LEFT HALF</b> of the pitch shows danger conceded (against {selectedTeam}).<br/>
                    • The <b>RIGHT HALF</b> shows danger created (by {selectedTeam}).
                  </p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
