/**
 * Normalization V2 — Simple rules:
 *
 * RAW EVENTS (highlight_events): ALL stored as L2R for the acting team.
 * The tagger flips coordinates before saving if direction is R2L.
 *
 * NORMALIZED EVENTS (normalized_highlight_events):
 *   - action_team === scoutedTeam  → keep L2R (scouted opponent always attacks L→R)
 *   - action_team !== scoutedTeam  → flip to R2L (opposition attacks R→L)
 */
export function normalizeHighlightEventV2(event, scoutedTeam) {
  const isScoutedTeam = event.action_team === scoutedTeam;

  // Scouted team: already L2R — no change
  if (isScoutedTeam) return { ...event };

  // Opposition: flip to R2L
  const n = { ...event };
  if (n.start_x != null) n.start_x = 120 - n.start_x;
  if (n.start_y != null) n.start_y = 80  - n.start_y;
  if (n.end_x   != null) n.end_x   = 120 - n.end_x;
  if (n.end_y   != null) n.end_y   = 80  - n.end_y;
  return n;
}

export function normalizeHighlightEventsV2(events, scoutedTeam) {
  return events.map(e => normalizeHighlightEventV2(e, scoutedTeam));
}

// ─── Legacy functions (kept for backward compat) ──────────────────────────────
export function normalizeEvent(event, focusTeam, match) {
  const isHome = match.home_team === focusTeam;
  const dir = event.home_team_direction;
  const needsMirror = (isHome && dir === "R2L") || (!isHome && dir === "L2R");
  if (!needsMirror) return { ...event };
  const normalized = { ...event };
  if (event.location_x != null) normalized.location_x = 120 - event.location_x;
  if (event.location_y != null) normalized.location_y = 80 - event.location_y;
  if (event.zone_col != null) normalized.zone_col = 13 - event.zone_col;
  if (event.zone_row != null) normalized.zone_row = 9 - event.zone_row;
  return normalized;
}

export function normalizeEvents(events, focusTeam, match) {
  return events.map((e) => normalizeEvent(e, focusTeam, match));
}

export function normalizeHighlightEvent(event, focusTeam, match) {
  const isFocusTeamHome = match.home_team === focusTeam;
  const originalDir = isFocusTeamHome
    ? event.home_team_direction
    : event.home_team_direction === "L2R" ? "R2L" : "L2R";
  const isFocusTeamEvent = event.team_type === "focus_team";
  let needsMirror = originalDir === "L2R" ? !isFocusTeamEvent : isFocusTeamEvent;
  if (!needsMirror) return { ...event };
  const normalized = { ...event };
  if (normalized.start_x != null) normalized.start_x = 120 - normalized.start_x;
  if (normalized.start_y != null) normalized.start_y = 80 - normalized.start_y;
  if (normalized.end_x != null) normalized.end_x = 120 - normalized.end_x;
  if (normalized.end_y != null) normalized.end_y = 80 - normalized.end_y;
  return normalized;
}

export function normalizeHighlightEvents(events, focusTeam, match) {
  return events.map((e) => normalizeHighlightEvent(e, focusTeam, match));
}
