-- ════════════════════════════════════════════════════════════════
--  FitProfit — panel administracyjny — schemat bazy danych (SQLite)
--  Wszystkie tabele konfiguracji wyzwania grywalizacyjnego.
--  Etap 1 używa: admin_users, contests, scoring_rules, branding,
--  charity_goals, rewards, info_pages, eko_settings, reminder_defaults.
--  Pozostałe tabele są gotowe pod kolejne etapy (CRUD modułów).
-- ════════════════════════════════════════════════════════════════

-- ── Konta panelu (logowanie administratora / koordynatora) ──
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'koordynator',   -- admin | koordynator
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Wyzwania / edycje ──
CREATE TABLE IF NOT EXISTS contests (
  id               SERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'draft',       -- draft | published | finished
  start_date       TEXT,
  end_date         TEXT,
  timezone         TEXT NOT NULL DEFAULT 'Europe/Warsaw',
  default_language TEXT NOT NULL DEFAULT 'pl',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Branding wyzwania ──
CREATE TABLE IF NOT EXISTS branding (
  contest_id    INTEGER PRIMARY KEY REFERENCES contests(id) ON DELETE CASCADE,
  logo_url      TEXT NOT NULL DEFAULT '',
  bg_image_url  TEXT NOT NULL DEFAULT '',
  more_info_url TEXT NOT NULL DEFAULT '',
  primary_color TEXT NOT NULL DEFAULT '#181C33'
);

-- ── Silnik punktacji — jedna reguła na kategorię aktywności ──
CREATE TABLE IF NOT EXISTS scoring_rules (
  id                     SERIAL PRIMARY KEY,
  contest_id             INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  category               TEXT NOT NULL,                 -- foot | wheel | ex | step
  enabled                INTEGER NOT NULL DEFAULT 1,
  points_per_unit        REAL NOT NULL DEFAULT 0,        -- pkt za jednostkę (np. 1 km)
  unit                   TEXT NOT NULL DEFAULT 'km',     -- km | activity | step1000
  min_threshold          REAL NOT NULL DEFAULT 0,        -- min. dystans aktywności (km)
  fixed_bonus            INTEGER NOT NULL DEFAULT 0,     -- stały bonus za aktywność
  bonus_max_per_day      INTEGER NOT NULL DEFAULT 0,     -- limit powtórzeń bonusu / dzień
  bonus_min_interval_min INTEGER NOT NULL DEFAULT 0,     -- min. odstęp między bonusami (min)
  daily_point_limit      INTEGER NOT NULL DEFAULT 100,   -- dzienny limit punktów
  step_goal              INTEGER NOT NULL DEFAULT 0,     -- cel kroków (kategoria step)
  UNIQUE(contest_id, category)
);

-- ── Ustawienia dołączania do wyzwania ──
CREATE TABLE IF NOT EXISTS join_settings (
  contest_id        INTEGER PRIMARY KEY REFERENCES contests(id) ON DELETE CASCADE,
  participant_limit INTEGER,
  entry_code        TEXT,
  team_code_join    INTEGER NOT NULL DEFAULT 0,
  invite_links      INTEGER NOT NULL DEFAULT 1,
  regulations_url   TEXT NOT NULL DEFAULT '',
  fairplay_screen   INTEGER NOT NULL DEFAULT 1,
  extra_consent     TEXT NOT NULL DEFAULT '',
  work_email_domains TEXT NOT NULL DEFAULT ''            -- domeny rozdzielone przecinkiem
);

-- ── Cele charytatywne ──
CREATE TABLE IF NOT EXISTS charity_goals (
  id            SERIAL PRIMARY KEY,
  contest_id    INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL DEFAULT 'common',          -- common | individual
  start_date    TEXT,
  end_date      TEXT,
  image_url     TEXT NOT NULL DEFAULT '',
  target_amount INTEGER NOT NULL DEFAULT 0,              -- cel w punktach
  currency      TEXT NOT NULL DEFAULT 'pkt'
);
CREATE TABLE IF NOT EXISTS charity_converters (
  id              SERIAL PRIMARY KEY,
  charity_goal_id INTEGER NOT NULL REFERENCES charity_goals(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  metric          TEXT NOT NULL DEFAULT 'km',
  ratio           REAL NOT NULL DEFAULT 0
);

-- ── Nagrody do wymiany ──
CREATE TABLE IF NOT EXISTS rewards (
  id          SERIAL PRIMARY KEY,
  contest_id  INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '🎁',
  cost        INTEGER NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT -1,               -- -1 = bez limitu
  enabled     INTEGER NOT NULL DEFAULT 1,
  image_url   TEXT NOT NULL DEFAULT '',                  -- zdjęcie nagrody (URL lub data-URL)
  codes       TEXT NOT NULL DEFAULT ''                   -- kody kuponów, jeden na linię
);

-- ── Strony informacyjne (zasady / nagrody / niestandardowe) ──
CREATE TABLE IF NOT EXISTS info_pages (
  id         SERIAL PRIMARY KEY,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,                              -- rules | rewards | custom
  title      TEXT NOT NULL,
  content    TEXT NOT NULL DEFAULT ''
);

-- ── Ustawienia EKO ──
CREATE TABLE IF NOT EXISTS eko_settings (
  contest_id          INTEGER PRIMARY KEY REFERENCES contests(id) ON DELETE CASCADE,
  enabled             INTEGER NOT NULL DEFAULT 1,
  auto_mark_commute   INTEGER NOT NULL DEFAULT 1,
  manual_mark_allowed INTEGER NOT NULL DEFAULT 1,
  commute_bonus       INTEGER NOT NULL DEFAULT 25
);
CREATE TABLE IF NOT EXISTS eko_transport_factors (
  id         SERIAL PRIMARY KEY,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  transport  TEXT NOT NULL,
  kg_per_km  REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS hq_locations (
  id         SERIAL PRIMARY KEY,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  lat        REAL,
  lng        REAL,
  radius_m   INTEGER NOT NULL DEFAULT 300
);

-- ── Domyślne ustawienia przypomnień o ćwiczeniu ──
CREATE TABLE IF NOT EXISTS reminder_defaults (
  contest_id INTEGER PRIMARY KEY REFERENCES contests(id) ON DELETE CASCADE,
  enabled    INTEGER NOT NULL DEFAULT 1,
  time       TEXT NOT NULL DEFAULT '08:00',
  days       TEXT NOT NULL DEFAULT '0,1,2,3,4',          -- indeksy dni
  bonus      INTEGER NOT NULL DEFAULT 25
);

-- ── Zespoły / firmy ──
CREATE TABLE IF NOT EXISTS team_groups (
  id SERIAL PRIMARY KEY,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS teams (
  id            SERIAL PRIMARY KEY,
  contest_id    INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  team_group_id INTEGER REFERENCES team_groups(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  code          TEXT
);

-- ── Użytkownicy aplikacji i uczestnicy wyzwania ──
CREATE TABLE IF NOT EXISTS app_users (
  id           SERIAL PRIMARY KEY,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  company      TEXT NOT NULL DEFAULT '',
  email        TEXT,
  display_name TEXT NOT NULL DEFAULT '',
  display_mode TEXT NOT NULL DEFAULT 'initial'           -- initial | nick
);
CREATE TABLE IF NOT EXISTS participants (
  id         SERIAL PRIMARY KEY,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  team_id    INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Aktywności i weryfikacja zdjęć ──
CREATE TABLE IF NOT EXISTS activities (
  id             SERIAL PRIMARY KEY,
  participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  distance_km    REAL NOT NULL DEFAULT 0,
  duration_min   INTEGER NOT NULL DEFAULT 0,
  points         INTEGER NOT NULL DEFAULT 0,
  source         TEXT NOT NULL DEFAULT 'manual',         -- manual | gps | phone | integration
  is_eco         INTEGER NOT NULL DEFAULT 0,
  eco_transport  TEXT,
  photo_url      TEXT,
  verify_status  TEXT NOT NULL DEFAULT 'none',           -- none | positive | suspicious | negative
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TEXT
);
CREATE TABLE IF NOT EXISTS photo_verifications (
  id          SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  score       INTEGER,                                   -- 1..10
  status      TEXT NOT NULL DEFAULT 'suspicious',
  reviewed_by INTEGER REFERENCES admin_users(id),
  reviewed_at TEXT
);

-- ── Punkty niestandardowe (ręczne przyznania) ──
CREATE TABLE IF NOT EXISTS custom_points (
  id             SERIAL PRIMARY KEY,
  contest_id     INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  operation_name TEXT NOT NULL,
  date_from      TEXT,
  date_to        TEXT,
  value          INTEGER NOT NULL DEFAULT 0,
  created_by     INTEGER REFERENCES admin_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Komunikacja ──
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  audience   TEXT NOT NULL DEFAULT 'all',
  sent_at    TEXT
);

-- ── Checklista publikacji wyzwania ──
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id         SERIAL PRIMARY KEY,
  contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  task_key   TEXT NOT NULL,
  label      TEXT NOT NULL,
  required   INTEGER NOT NULL DEFAULT 1,
  completed  INTEGER NOT NULL DEFAULT 0
);

-- ── Dziennik zmian w panelu ──
CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL PRIMARY KEY,
  admin_id   INTEGER REFERENCES admin_users(id),
  action     TEXT NOT NULL,
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
