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
