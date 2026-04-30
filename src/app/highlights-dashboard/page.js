"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeHighlightEvents } from "@/lib/normalize";
import DangerPitch from "@/components/DangerPitch";
import FilterBar from "@/components/FilterBar";

export default function HighlightsDashboardPage() {
  const [matches, setMatches] = useState([]);
  const [highlightEvents, setHighlightEvents] = useState([]);
  const [teamSheets, setTeamSheets] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Load all matches ───
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("opp_matches")
        .select("*")
        .eq("hilight", true)
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

  // ─── Toggle match selection ───
  const handleMatchToggle = (matchId) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId]
    );
  };

  // ─── Normalize events (focus team attacks L→R) ───
  const normalizedHighlights = useMemo(() => {
    if (!selectedTeam) return [];
    const result = [];
    highlightEvents.forEach((ev) => {
      const match = matches.find((m) => m.id === ev.match_id);
      if (!match) return;
      const normalized = normalizeHighlightEvents([ev], selectedTeam, match);
      result.push(...normalized);
    });
    return result;
  }, [highlightEvents, selectedTeam, matches]);

  const dangerCreated = normalizedHighlights.filter(e => e.team_type === "focus_team");
  const dangerConceded = normalizedHighlights.filter(e => e.team_type === "opponent");

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
            {/* ─── PITCH VISUALIZATIONS (2×2) ─── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {/* Highlight Maps (Danger Created / Conceded) */}
              <DangerPitch
                title={`⚔️ ${selectedTeam} — DANGER CREATED`}
                events={dangerCreated}
                teamSheet={teamSheets}
              />
              <DangerPitch
                title={`🛡️ ${selectedTeam} — DANGER CONCEDED`}
                events={dangerConceded}
                teamSheet={teamSheets}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
