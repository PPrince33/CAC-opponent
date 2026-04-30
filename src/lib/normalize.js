/**
 * Normalize highlight events so the SCOUTED (opponent) team always attacks L→R.
 *
 * Rule: In normalized view —
 *   - Scouted team events (action_team === scoutedTeam) → L2R
 *   - Other team events → R2L (naturally, since they play in the same match)
 *
 * We achieve this by checking which direction the scouted team is actually
 * attacking in the raw data, then mirroring ALL events if they're going R2L.
 */
export function normalizeHighlightEventV2(event, scoutedTeam, match) {
  // Determine which direction the scouted team is attacking in this match
  const scoutedTeamIsHome = match.home_team === scoutedTeam;
  
  let scoutedTeamL2R;
  if (scoutedTeamIsHome) {
    scoutedTeamL2R = event.home_team_direction === 'L2R';
  } else {
    // Away team always attacks opposite to home_team_direction
    scoutedTeamL2R = event.home_team_direction === 'R2L';
  }

  // If scouted team is already going L2R, no changes needed
  if (scoutedTeamL2R) return { ...event };

  // Otherwise mirror ALL coordinates (both teams get flipped together)
  const normalized = { ...event };
  if (normalized.start_x != null) normalized.start_x = 120 - normalized.start_x;
  if (normalized.start_y != null) normalized.start_y = 80 - normalized.start_y;
  if (normalized.end_x != null)   normalized.end_x   = 120 - normalized.end_x;
  if (normalized.end_y != null)   normalized.end_y   = 80 - normalized.end_y;

  return normalized;
}

export function normalizeHighlightEventsV2(events, scoutedTeam, match) {
  return events.map(e => normalizeHighlightEventV2(e, scoutedTeam, match));
}

// ──────────────────────────────────────────────────────────────────────────────
// Legacy functions kept for backward compatibility with old opp_raw_events flow
// ──────────────────────────────────────────────────────────────────────────────

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
