-- Moshi and Pals - Shared Online Leaderboard Schema
-- Cloudflare D1 Database

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  round INTEGER NOT NULL,
  mode TEXT NOT NULL,          -- 'standard' | 'fluSeason'
  difficulty TEXT NOT NULL,    -- 'walkIn' | 'urgent' | 'trauma'
  provider TEXT NOT NULL,      -- character id (eugene, kaya, lucien, ken, etc.)
  streak INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_rank ON scores (mode, difficulty, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_provider ON scores (mode, difficulty, provider, score DESC);
