/**
 * Normalize event coordinates so the focus team always attacks Left → Right.
 *
 * @param {Object} event       - The raw event from opp_raw_events
 * @param {string} focusTeam   - The team name we want attacking L→R
 * @param {Object} match       - The match record from opp_matches
 * @returns {Object}           - Event with normalized location_x / location_y / zone_col / zone_row
 */
export function normalizeEvent(event, focusTeam, match) {
  const isHome = match.home_team === focusTeam;
  const dir = event.home_team_direction;

  // Determine if coordinates need mirroring
  const needsMirror =
    (isHome && dir === "R2L") || (!isHome && dir === "L2R");

  if (!needsMirror) return { ...event };

  const normalized = { ...event };

  // Mirror coordinate-based events
  if (event.location_x != null) {
    normalized.location_x = 120 - event.location_x;
  }
  if (event.location_y != null) {
    normalized.location_y = 80 - event.location_y;
  }

  // Mirror zone-based events
  if (event.zone_col != null) {
    normalized.zone_col = 13 - event.zone_col;
  }
  if (event.zone_row != null) {
    normalized.zone_row = 9 - event.zone_row;
  }

  return normalized;
}

/**
 * Normalize an array of events for a given focus team.
 */
export function normalizeEvents(events, focusTeam, match) {
  return events.map((e) => normalizeEvent(e, focusTeam, match));
}

/**
 * Normalize highlight events for the Danger Map.
 * CRITICAL RULE: Focus Team always attacks Left → Right (L2R).
 *
 * @param {Object} event     - Raw event from highlight_events
 * @param {string} focusTeam - The team we are scouting
 * @param {Object} match     - The match record
 */
export function normalizeHighlightEvent(event, focusTeam, match) {
  const isFocusTeamHome = match.home_team === focusTeam;
  const originalDir = isFocusTeamHome
    ? event.home_team_direction
    : event.home_team_direction === "L2R"
    ? "R2L"
    : "L2R";

  const isFocusTeamEvent = event.team_type === "focus_team";
  let needsMirror = false;

  if (originalDir === "L2R") {
    // Focus team originally L2R: Focus stays same, Opponent mirrors
    needsMirror = !isFocusTeamEvent;
  } else {
    // Focus team originally R2L: Focus mirrors, Opponent stays same
    needsMirror = isFocusTeamEvent;
  }

  if (!needsMirror) return { ...event };

  const normalized = { ...event };

  if (normalized.start_x != null) {
    normalized.start_x = 120 - normalized.start_x;
  }
  if (normalized.start_y != null) {
    normalized.start_y = 80 - normalized.start_y;
  }
  if (normalized.end_x != null) {
    normalized.end_x = 120 - normalized.end_x;
  }
  if (normalized.end_y != null) {
    normalized.end_y = 80 - normalized.end_y;
  }

  return normalized;
}

export function normalizeHighlightEvents(events, focusTeam, match) {
  return events.map((e) => normalizeHighlightEvent(e, focusTeam, match));
}
