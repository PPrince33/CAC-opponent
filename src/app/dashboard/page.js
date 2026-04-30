"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeEvents } from "@/lib/normalize";
import GridPitch from "@/components/GridPitch";
import CoordinatePitch from "@/components/CoordinatePitch";
import FilterBar from "@/components/FilterBar";

export default function DashboardPage() {
  const [matches, setMatches] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Load all matches ───
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("opp_matches")
        .select("*")
        .eq("hilight", false)
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
      setAllEvents([]);
      setHighlightEvents([]);
      setTeamSheets([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("opp_raw_events")
        .select("*")
        .in("match_id", selectedMatchIds)
        .order("created_at", { ascending: true });
      setAllEvents(data || []);
    })();
  }, [selectedMatchIds]);

  // ─── Toggle match selection ───
  const handleMatchToggle = (matchId) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId]
    );
  };

  // ─── Normalize events (focus team attacks L→R) ───
  const normalizedEvents = useMemo(() => {
    if (!selectedTeam) return [];
    const result = [];
    allEvents.forEach((ev) => {
      const match = matches.find((m) => m.id === ev.match_id);
      if (!match) return;
      const normalized = normalizeEvents([ev], selectedTeam, match);
      result.push(...normalized);
    });
    return result;
  }, [allEvents, selectedTeam, matches]);



  // ─── Categorize events ───
  const gainEvents = normalizedEvents.filter((e) => e.event_type === "gain_ball");
  const loseEvents = normalizedEvents.filter((e) => e.event_type === "lose_ball");
  const shotTakenEvents = normalizedEvents.filter((e) => e.event_type === "shot_taken");
  const shotConcededEvents = normalizedEvents.filter((e) => e.event_type === "shot_conceded");



  // ─── Stats ───
  const goals = shotTakenEvents.filter((e) => e.shot_outcome === "goal").length;
  const goalsConceded = shotConcededEvents.filter((e) => e.shot_outcome === "goal").length;
  const onTarget = shotTakenEvents.filter((e) => e.shot_outcome === "target").length;

  const stats = [
    { label: "BALL GAINS", value: gainEvents.length, color: "#2DD4BF" },
    { label: "BALL LOSSES", value: loseEvents.length, color: "#FB923C" },
    { label: "SHOTS FOR", value: shotTakenEvents.length, color: "#60A5FA" },
    { label: "ON TARGET", value: onTarget, color: "#FACC15" },
    { label: "GOALS FOR", value: goals, color: "#34D399" },
    { label: "SHOTS AGAINST", value: shotConcededEvents.length, color: "#F87171" },
    { label: "GOALS AGAINST", value: goalsConceded, color: "#EF4444" },
    { label: "MATCHES", value: selectedMatchIds.length, color: "#A78BFA" },
  ];

  return (
    <div style={{ minHeight: "calc(100vh - 80px)" }}>
      {/* ─── FILTER BAR ─── */}
      <FilterBar
        teams={teams}
        selectedTeam={selectedTeam}
        onTeamChange={setSelectedTeam}
        matches={teamMatches}
        selectedMatches={selectedMatchIds}
        onMatchToggle={handleMatchToggle}
      />

      <div style={{ padding: 16 }}>
        {loading ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center", fontSize: "0.85rem" }}>
            LOADING DATA...
          </div>
        ) : !selectedTeam ? (
          <div className="brutal-card" style={{ padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 8 }}>
              SELECT AN OPPONENT
            </p>
            <p style={{ fontSize: "0.8rem", color: "#666" }}>
              USE THE FILTER BAR ABOVE TO CHOOSE A TEAM
            </p>
          </div>
        ) : (
          <>
            {/* ─── STATS ROW ─── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="brutal-card"
                  style={{ padding: "10px 12px", textAlign: "center" }}
                >
                  <div
                    style={{
                      fontSize: "1.8rem",
                      fontWeight: 800,
                      color: s.color,
                      textShadow: "1px 1px 0 #000",
                      WebkitTextStroke: "1px #000",
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── PITCH VISUALIZATIONS (2×2) ─── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {/* Full pitch heatmaps */}
              <GridPitch
                title={`⬆ ${selectedTeam} — BALL GAINS`}
                events={gainEvents}
                colorScheme="teal"
                mode="heatmap"
              />
              <GridPitch
                title={`⬇ ${selectedTeam} — BALL LOSSES`}
                events={loseEvents}
                colorScheme="orange"
                mode="heatmap"
              />

              {/* Combined Shot map — full pitch */}
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "100%", maxWidth: "800px" }}>
                  <CoordinatePitch
                    title={`🎯 ${selectedTeam} — SHOTS (LEFT: AGAINST, RIGHT: FOR)`}
                    events={[...shotTakenEvents, ...shotConcededEvents]}
                    zoomToBox={null}
                    mode="display"
                  />
                </div>
              </div>


            </div>
          </>
        )}
      </div>
    </div>
  );
}
