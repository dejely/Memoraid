export const LATEST_DB_VERSION = 3;

export const MIGRATIONS: Record<number, string> = {
  1: `
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      source_type TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_studied_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY NOT NULL,
      deck_id TEXT NOT NULL,
      term TEXT NOT NULL,
      definition TEXT NOT NULL,
      example TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      deck_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      current_index INTEGER NOT NULL DEFAULT 0,
      order_json TEXT NOT NULL DEFAULT '[]',
      shuffle_enabled INTEGER NOT NULL DEFAULT 0,
      easy_count INTEGER NOT NULL DEFAULT 0,
      hard_count INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      UNIQUE(deck_id, mode),
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_stats (
      card_id TEXT PRIMARY KEY NOT NULL,
      deck_id TEXT NOT NULL,
      ease_score REAL NOT NULL DEFAULT 2.5,
      easy_count INTEGER NOT NULL DEFAULT 0,
      hard_count INTEGER NOT NULL DEFAULT 0,
      last_reviewed_at TEXT,
      due_at TEXT,
      last_result TEXT,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS test_attempts (
      id TEXT PRIMARY KEY NOT NULL,
      deck_id TEXT NOT NULL,
      deck_title TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      objective_correct INTEGER NOT NULL,
      objective_total INTEGER NOT NULL,
      written_count INTEGER NOT NULL DEFAULT 0,
      score_percent REAL NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      weak_card_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS test_questions (
      id TEXT PRIMARY KEY NOT NULL,
      attempt_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      question_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      selected_answer TEXT,
      options_json TEXT,
      is_correct INTEGER,
      explanation TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_review_stats_deck_due ON review_stats(deck_id, due_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_test_attempts_finished_at ON test_attempts(finished_at DESC);
  `,
  2: `
    DELETE FROM decks
    WHERE title = 'World Geography Essentials'
      AND description = 'Fast refreshers for capitals, climate, and regional landmarks.'
      AND tags_json = '["geography","travel","seeded"]';

    DELETE FROM decks
    WHERE title = 'Biology Foundations'
      AND description = 'Short, high-yield cell and genetics notes for quick study blocks.'
      AND tags_json = '["biology","science","seeded"]';
  `,
  3: `
    ALTER TABLE cards ADD COLUMN grading_mode TEXT NOT NULL DEFAULT 'self_review' CHECK(grading_mode IN ('self_review','numeric','expression'));
    ALTER TABLE cards ADD COLUMN numeric_tolerance REAL NOT NULL DEFAULT 0.001 CHECK(numeric_tolerance >= 0);
    ALTER TABLE test_questions ADD COLUMN grading_method TEXT NOT NULL DEFAULT 'self_review' CHECK(grading_method IN ('self_review','automatic'));
    UPDATE test_questions SET grading_method = 'automatic' WHERE question_type <> 'written';
    CREATE TABLE review_events (
      id TEXT PRIMARY KEY NOT NULL, card_id TEXT NOT NULL, deck_id TEXT NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('easy','hard','correct','incorrect')),
      happened_at TEXT NOT NULL, study_date TEXT NOT NULL, timezone TEXT NOT NULL,
      was_due INTEGER NOT NULL, was_weak INTEGER NOT NULL,
      grading_method TEXT NOT NULL CHECK(grading_method IN ('self_review','automatic'))
    );
    CREATE INDEX review_events_card_day ON review_events(card_id, study_date, happened_at);
  `,
};
