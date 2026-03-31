CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_studied_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  example TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS review_stats (
  card_id TEXT PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  ease_score DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  easy_count INTEGER NOT NULL DEFAULT 0,
  hard_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  last_result TEXT
);

CREATE TABLE IF NOT EXISTS test_attempts (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL,
  deck_title TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  objective_correct INTEGER NOT NULL,
  objective_total INTEGER NOT NULL,
  written_count INTEGER NOT NULL DEFAULT 0,
  score_percent DOUBLE PRECISION NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL,
  weak_card_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS test_questions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  selected_answer TEXT,
  options_json JSONB,
  is_correct BOOLEAN,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_events (
  sequence BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_review_stats_deck_id ON review_stats(deck_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_attempt_id ON test_questions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_sequence ON sync_events(sequence);
CREATE INDEX IF NOT EXISTS idx_sync_events_entity ON sync_events(entity_type, entity_id, sequence DESC);
