-- ============================================================
-- CAC OPPONENT SCOUT — SUPABASE SCHEMA
-- Run this in the Supabase SQL Editor to create all tables,
-- RLS policies, and normalization view.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS opp_matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  match_date    DATE,
  score_home    INT DEFAULT 0,
  score_away    INT DEFAULT 0,
  video_link    TEXT,
  hilight       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opp_raw_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id            UUID NOT NULL REFERENCES opp_matches(id) ON DELETE CASCADE,
  timestamp           TEXT,                          -- video timestamp e.g. "23:45"
  half                INT CHECK (half IN (1, 2)),
  home_team_direction TEXT CHECK (home_team_direction IN ('L2R', 'R2L')),
  event_type          TEXT NOT NULL CHECK (event_type IN (
                        'gain_ball', 'lose_ball', 'shot_taken', 'shot_conceded'
                      )),
  location_x          FLOAT,                         -- 0–120
  location_y          FLOAT,                         -- 0–80
  zone_col            INT,                           -- 1–12 (grid events only)
  zone_row            INT,                           -- 1–8  (grid events only)
  shot_outcome        TEXT CHECK (shot_outcome IN ('miss', 'target', 'goal') OR shot_outcome IS NULL),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by match
CREATE INDEX IF NOT EXISTS idx_opp_raw_events_match ON opp_raw_events(match_id);


-- ────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY — Open access (anon)
-- ────────────────────────────────────────────────────────────

ALTER TABLE opp_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE opp_raw_events ENABLE ROW LEVEL SECURITY;

-- opp_matches: Drop existing policies
DROP POLICY IF EXISTS "opp_matches_select_open" ON opp_matches;
DROP POLICY IF EXISTS "opp_matches_insert_open" ON opp_matches;
DROP POLICY IF EXISTS "opp_matches_update_open" ON opp_matches;
DROP POLICY IF EXISTS "opp_matches_delete_open" ON opp_matches;
DROP POLICY IF EXISTS "opp_matches_insert_auth" ON opp_matches;
DROP POLICY IF EXISTS "opp_matches_update_auth" ON opp_matches;
DROP POLICY IF EXISTS "opp_matches_delete_auth" ON opp_matches;

-- opp_matches: SELECT open, but mutations require auth
CREATE POLICY "opp_matches_select_open" ON opp_matches FOR SELECT USING (true);
CREATE POLICY "opp_matches_insert_auth" ON opp_matches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "opp_matches_update_auth" ON opp_matches FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "opp_matches_delete_auth" ON opp_matches FOR DELETE USING (auth.uid() IS NOT NULL);

-- opp_raw_events: Drop existing policies
DROP POLICY IF EXISTS "opp_raw_events_select_open" ON opp_raw_events;
DROP POLICY IF EXISTS "opp_raw_events_insert_open" ON opp_raw_events;
DROP POLICY IF EXISTS "opp_raw_events_update_open" ON opp_raw_events;
DROP POLICY IF EXISTS "opp_raw_events_delete_open" ON opp_raw_events;
DROP POLICY IF EXISTS "opp_raw_events_insert_auth" ON opp_raw_events;
DROP POLICY IF EXISTS "opp_raw_events_update_auth" ON opp_raw_events;
DROP POLICY IF EXISTS "opp_raw_events_delete_auth" ON opp_raw_events;

-- opp_raw_events: SELECT open, but mutations require auth
CREATE POLICY "opp_raw_events_select_open" ON opp_raw_events FOR SELECT USING (true);
CREATE POLICY "opp_raw_events_insert_auth" ON opp_raw_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "opp_raw_events_update_auth" ON opp_raw_events FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "opp_raw_events_delete_auth" ON opp_raw_events FOR DELETE USING (auth.uid() IS NOT NULL);


-- ────────────────────────────────────────────────────────────
-- 3. NORMALIZED EVENTS VIEW
-- Applies L2R normalization so focus team always attacks L→R
-- Usage: SELECT * FROM opp_normalized_events WHERE focus_team = 'Team A'
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW opp_normalized_events AS
SELECT
  e.id,
  e.match_id,
  e.timestamp,
  e.half,
  e.home_team_direction,
  e.event_type,
  e.shot_outcome,
  e.notes,
  e.zone_col,
  e.zone_row,
  e.created_at,

  -- Original coords
  e.location_x AS raw_x,
  e.location_y AS raw_y,

  -- Home team normalized (always attacking L→R)
  m.home_team,
  m.away_team,

  -- Normalized X for home team perspective
  CASE
    WHEN e.home_team_direction = 'L2R' THEN e.location_x
    WHEN e.home_team_direction = 'R2L' THEN 120.0 - e.location_x
    ELSE e.location_x
  END AS home_norm_x,

  CASE
    WHEN e.home_team_direction = 'L2R' THEN e.location_y
    WHEN e.home_team_direction = 'R2L' THEN 80.0 - e.location_y
    ELSE e.location_y
  END AS home_norm_y,

  -- Normalized X for away team perspective (inverted)
  CASE
    WHEN e.home_team_direction = 'L2R' THEN 120.0 - e.location_x
    WHEN e.home_team_direction = 'R2L' THEN e.location_x
    ELSE e.location_x
  END AS away_norm_x,

  CASE
    WHEN e.home_team_direction = 'L2R' THEN 80.0 - e.location_y
    WHEN e.home_team_direction = 'R2L' THEN e.location_y
    ELSE e.location_y
  END AS away_norm_y,

  -- Normalized zone for home team perspective
  CASE
    WHEN e.zone_col IS NOT NULL AND e.home_team_direction = 'R2L' THEN 13 - e.zone_col
    ELSE e.zone_col
  END AS home_norm_zone_col,

  CASE
    WHEN e.zone_row IS NOT NULL AND e.home_team_direction = 'R2L' THEN 9 - e.zone_row
    ELSE e.zone_row
  END AS home_norm_zone_row,

  -- Normalized zone for away team perspective
  CASE
    WHEN e.zone_col IS NOT NULL AND e.home_team_direction = 'L2R' THEN 13 - e.zone_col
    ELSE e.zone_col
  END AS away_norm_zone_col,

  CASE
    WHEN e.zone_row IS NOT NULL AND e.home_team_direction = 'L2R' THEN 9 - e.zone_row
    ELSE e.zone_row
  END AS away_norm_zone_row

FROM opp_raw_events e
JOIN opp_matches m ON m.id = e.match_id;


-- ────────────────────────────────────────────────────────────
-- 4. HIGHLIGHTS WORKFLOW TABLES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_sheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES opp_matches(id) ON DELETE CASCADE,
  team_name       TEXT NOT NULL,
  player_name     TEXT NOT NULL,
  jersey_number   TEXT,
  position        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_sheets_match ON team_sheets(match_id);

CREATE TABLE IF NOT EXISTS highlight_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id            UUID NOT NULL REFERENCES opp_matches(id) ON DELETE CASCADE,
  timestamp           TEXT,
  home_team_direction TEXT CHECK (home_team_direction IN ('L2R', 'R2L')),
  team_type           TEXT CHECK (team_type IN ('focus_team', 'opponent')),
  event_type          TEXT NOT NULL CHECK (event_type IN ('key_pass', 'assist', 'shot')),
  start_x             FLOAT,
  start_y             FLOAT,
  end_x               FLOAT,
  end_y               FLOAT,
  action_player_id    UUID REFERENCES team_sheets(id) ON DELETE SET NULL,
  reaction_player_id  UUID REFERENCES team_sheets(id) ON DELETE SET NULL,
  shot_outcome        TEXT CHECK (shot_outcome IN ('miss', 'target', 'goal', 'blocked') OR shot_outcome IS NULL),
  goal_x              FLOAT,
  goal_y              FLOAT,
  body_part           TEXT,
  half                TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_highlight_events_match ON highlight_events(match_id);

-- ROW LEVEL SECURITY
ALTER TABLE team_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_sheets_select_open" ON team_sheets;
DROP POLICY IF EXISTS "team_sheets_insert_auth" ON team_sheets;
DROP POLICY IF EXISTS "team_sheets_update_auth" ON team_sheets;
DROP POLICY IF EXISTS "team_sheets_delete_auth" ON team_sheets;

CREATE POLICY "team_sheets_select_open" ON team_sheets FOR SELECT USING (true);
CREATE POLICY "team_sheets_insert_auth" ON team_sheets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "team_sheets_update_auth" ON team_sheets FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "team_sheets_delete_auth" ON team_sheets FOR DELETE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "highlight_events_select_open" ON highlight_events;
DROP POLICY IF EXISTS "highlight_events_insert_auth" ON highlight_events;
DROP POLICY IF EXISTS "highlight_events_update_auth" ON highlight_events;
DROP POLICY IF EXISTS "highlight_events_delete_auth" ON highlight_events;

CREATE POLICY "highlight_events_select_open" ON highlight_events FOR SELECT USING (true);
CREATE POLICY "highlight_events_insert_auth" ON highlight_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "highlight_events_update_auth" ON highlight_events FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "highlight_events_delete_auth" ON highlight_events FOR DELETE USING (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────
-- 5. NORMALIZED HIGHLIGHT EVENTS (L2R perspective)
-- ────────────────────────────────────────────────────────────
-- Populated by clicking "Finish Highlight" in the tagger.
-- All coordinates are normalized so the OPPONENT team (being scouted)
-- always attacks Left → Right.

CREATE TABLE IF NOT EXISTS normalized_highlight_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id   UUID REFERENCES highlight_events(id) ON DELETE CASCADE,
  match_id          UUID NOT NULL REFERENCES opp_matches(id) ON DELETE CASCADE,
  opponent_team     TEXT,                        -- the scouted team (next opponent)
  action_team       TEXT,                        -- who performed the action
  direction         TEXT DEFAULT 'L2R',          -- L2R = scouted team, R2L = opposition
  timestamp         TEXT,
  event_type        TEXT,
  start_x           FLOAT,
  start_y           FLOAT,
  end_x             FLOAT,
  end_y             FLOAT,
  shot_outcome      TEXT,
  body_part         TEXT,
  half              TEXT,
  action_player_id  UUID,
  video_link        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_norm_events_match ON normalized_highlight_events(match_id);
CREATE INDEX IF NOT EXISTS idx_norm_events_opponent ON normalized_highlight_events(opponent_team);

ALTER TABLE normalized_highlight_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "norm_select_open"  ON normalized_highlight_events FOR SELECT USING (true);
CREATE POLICY "norm_insert_auth"  ON normalized_highlight_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "norm_delete_auth"  ON normalized_highlight_events FOR DELETE USING (auth.uid() IS NOT NULL);

-- ────────────────────────────────────────────────────────────
-- 6. DATA NORMALIZATION TRIGGERS
-- ────────────────────────────────────────────────────────────
-- Enforce uppercase for team names and player names to ensure
-- case-insensitive matching always works on the frontend.

-- Uppercase opp_matches
CREATE OR REPLACE FUNCTION uppercase_opp_matches()
RETURNS TRIGGER AS $$
BEGIN
  NEW.home_team = UPPER(TRIM(NEW.home_team));
  NEW.away_team = UPPER(TRIM(NEW.away_team));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_uppercase_opp_matches ON opp_matches;
CREATE TRIGGER trig_uppercase_opp_matches
BEFORE INSERT OR UPDATE ON opp_matches
FOR EACH ROW EXECUTE FUNCTION uppercase_opp_matches();

-- Uppercase team_sheets
CREATE OR REPLACE FUNCTION uppercase_team_sheets()
RETURNS TRIGGER AS $$
BEGIN
  NEW.team_name = UPPER(TRIM(NEW.team_name));
  NEW.player_name = UPPER(TRIM(NEW.player_name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_uppercase_team_sheets ON team_sheets;
CREATE TRIGGER trig_uppercase_team_sheets
BEFORE INSERT OR UPDATE ON team_sheets
FOR EACH ROW EXECUTE FUNCTION uppercase_team_sheets();

-- Uppercase normalized_highlight_events
CREATE OR REPLACE FUNCTION uppercase_norm_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.opponent_team IS NOT NULL THEN
    NEW.opponent_team = UPPER(TRIM(NEW.opponent_team));
  END IF;
  IF NEW.action_team IS NOT NULL THEN
    NEW.action_team = UPPER(TRIM(NEW.action_team));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_uppercase_norm_events ON normalized_highlight_events;
CREATE TRIGGER trig_uppercase_norm_events
BEFORE INSERT OR UPDATE ON normalized_highlight_events
FOR EACH ROW EXECUTE FUNCTION uppercase_norm_events();
