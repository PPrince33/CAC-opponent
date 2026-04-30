/**
 * Normalization V2
 *
 * Rule: ALL normalized_highlight_events are stored as L2R.
 *   - team_direction = 'L2R' → copy as-is
 *   - team_direction = 'R2L' → flip: 120-x, 80-y for start and end coords
 *
 * Dashboard then flips opposition events for display (R2L) while keeping
 * next opponent as L2R, giving a realistic match-view visualization.
 */
export function normalizeHighlightEventV2(event) {
  if (event.team_direction !== 'R2L') return { ...event };
  const n = { ...event };
  if (n.start_x != null) n.start_x = 120 - n.start_x;
  if (n.start_y != null) n.start_y = 80  - n.start_y;
  if (n.end_x   != null) n.end_x   = 120 - n.end_x;
  if (n.end_y   != null) n.end_y   = 80  - n.end_y;
  return n;
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
