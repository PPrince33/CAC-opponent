/**
 * Normalization V2 — All events stored as L2R.
 *
 * The tagger already flips coordinates to L2R at save time (if direction was R2L).
 * So raw events in highlight_events are ALL L2R for the acting team.
 *
 * Normalization simply copies them into normalized_highlight_events with direction='L2R'.
 * Dashboard colors distinguish teams (green=next opponent, red=others) — both L2R.
 */
export function normalizeHighlightEventV2(event) {
  // Already L2R from tagger — no flipping needed
  return { ...event };
}

export function normalizeHighlightEventsV2(events) {
  return events.map(e => normalizeHighlightEventV2(e));
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
