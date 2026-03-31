import { getDatabase } from "../client";
import { nowIso } from "../../utils/date";
import type {
  BackendConfig,
  ReviewStats,
  SourceType,
  SyncChangeSet,
  SyncDeckRecord,
  SyncEntityType,
  SyncOperation,
  SyncProvider,
  SyncQueueEntry,
  SyncRuntimeState,
  SyncStatus,
  SyncTestAttemptRecord,
} from "../../types/models";

type StoredSyncStateRow = {
  id: string;
  provider: SyncProvider;
  state: SyncRuntimeState;
  api_base_url: string | null;
  last_synced_at: string | null;
  last_verified_at: string | null;
  last_cursor: string | null;
  last_error: string | null;
  server_name: string | null;
  server_version: string | null;
  updated_at: string;
};

type QueueRow = {
  id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: SyncOperation;
  payload_json: string;
  created_at: string;
  updated_at: string;
  retry_count: number;
  last_error: string | null;
};

type DeckRow = {
  id: string;
  title: string;
  description: string;
  tags_json: string;
  source_type: SourceType;
  created_at: string;
  updated_at: string;
  last_studied_at: string | null;
};

type CardRow = {
  id: string;
  deck_id: string;
  term: string;
  definition: string;
  example: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  ease_score: number | null;
  easy_count: number | null;
  hard_count: number | null;
  last_reviewed_at: string | null;
  due_at: string | null;
  last_result: "easy" | "hard" | "correct" | "incorrect" | null;
};

type TestAttemptRow = {
  id: string;
  deck_id: string;
  deck_title: string;
  total_questions: number;
  correct_answers: number;
  objective_correct: number;
  objective_total: number;
  written_count: number;
  score_percent: number;
  started_at: string;
  finished_at: string;
  weak_card_count: number;
};

type TestQuestionRow = {
  id: string;
  attempt_id: string;
  card_id: string;
  question_type: "multiple_choice" | "true_false" | "written";
  prompt: string;
  correct_answer: string;
  selected_answer: string | null;
  options_json: string | null;
  is_correct: number | null;
  explanation: string | null;
  created_at: string;
};

const DEFAULT_SYNC_STATE_ROW: StoredSyncStateRow = {
  id: "default",
  provider: "local-only",
  state: "disabled",
  api_base_url: null,
  last_synced_at: null,
  last_verified_at: null,
  last_cursor: null,
  last_error: null,
  server_name: null,
  server_version: null,
  updated_at: nowIso(),
};

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function parseOptions(optionsJson: string | null): string[] | null {
  if (!optionsJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(optionsJson);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : null;
  } catch {
    return null;
  }
}

function parseReviewStats(row: CardRow): ReviewStats | null {
  if (row.ease_score === null || row.easy_count === null || row.hard_count === null) {
    return null;
  }

  return {
    cardId: row.id,
    deckId: row.deck_id,
    easeScore: row.ease_score,
    easyCount: row.easy_count,
    hardCount: row.hard_count,
    lastReviewedAt: row.last_reviewed_at,
    dueAt: row.due_at,
    lastResult: row.last_result,
  };
}

async function getStoredSyncStateRow(): Promise<StoredSyncStateRow> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<StoredSyncStateRow>(
    `
      SELECT *
      FROM sync_state
      WHERE id = 'default'
      LIMIT 1;
    `,
  );

  if (row) {
    return row;
  }

  await database.runAsync(
    `
      INSERT INTO sync_state (
        id,
        provider,
        state,
        api_base_url,
        last_synced_at,
        last_verified_at,
        last_cursor,
        last_error,
        server_name,
        server_version,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      DEFAULT_SYNC_STATE_ROW.id,
      DEFAULT_SYNC_STATE_ROW.provider,
      DEFAULT_SYNC_STATE_ROW.state,
      DEFAULT_SYNC_STATE_ROW.api_base_url,
      DEFAULT_SYNC_STATE_ROW.last_synced_at,
      DEFAULT_SYNC_STATE_ROW.last_verified_at,
      DEFAULT_SYNC_STATE_ROW.last_cursor,
      DEFAULT_SYNC_STATE_ROW.last_error,
      DEFAULT_SYNC_STATE_ROW.server_name,
      DEFAULT_SYNC_STATE_ROW.server_version,
      DEFAULT_SYNC_STATE_ROW.updated_at,
    ],
  );

  return DEFAULT_SYNC_STATE_ROW;
}

export async function patchSyncState(
  patch: Partial<Omit<StoredSyncStateRow, "id" | "updated_at">>,
): Promise<void> {
  const database = await getDatabase();
  const existing = await getStoredSyncStateRow();
  const nextState: StoredSyncStateRow = {
    ...existing,
    ...patch,
    updated_at: nowIso(),
  };

  await database.runAsync(
    `
      INSERT INTO sync_state (
        id,
        provider,
        state,
        api_base_url,
        last_synced_at,
        last_verified_at,
        last_cursor,
        last_error,
        server_name,
        server_version,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id)
      DO UPDATE SET
        provider = excluded.provider,
        state = excluded.state,
        api_base_url = excluded.api_base_url,
        last_synced_at = excluded.last_synced_at,
        last_verified_at = excluded.last_verified_at,
        last_cursor = excluded.last_cursor,
        last_error = excluded.last_error,
        server_name = excluded.server_name,
        server_version = excluded.server_version,
        updated_at = excluded.updated_at;
    `,
    [
      nextState.id,
      nextState.provider,
      nextState.state,
      nextState.api_base_url,
      nextState.last_synced_at,
      nextState.last_verified_at,
      nextState.last_cursor,
      nextState.last_error,
      nextState.server_name,
      nextState.server_version,
      nextState.updated_at,
    ],
  );
}

export async function getSyncCursor(): Promise<string | null> {
  const state = await getStoredSyncStateRow();
  return state.last_cursor;
}

export async function getPendingSyncCount(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_queue;");

  return row?.count ?? 0;
}

export async function getSyncStatusSnapshot(config: BackendConfig): Promise<SyncStatus> {
  const [state, pendingChanges] = await Promise.all([getStoredSyncStateRow(), getPendingSyncCount()]);
  const runtimeState = config.syncEnabled ? state.state : "disabled";

  return {
    provider: config.syncEnabled ? config.provider : "local-only",
    apiBaseUrl: config.apiBaseUrl,
    lastSyncedAt: state.last_synced_at,
    lastVerifiedAt: state.last_verified_at,
    pendingChanges,
    lastError: state.last_error,
    serverName: state.server_name,
    serverVersion: state.server_version,
    state: runtimeState,
  };
}

async function getDeckSyncRecord(deckId: string): Promise<SyncDeckRecord | null> {
  const database = await getDatabase();
  const deck = await database.getFirstAsync<DeckRow>(
    `
      SELECT *
      FROM decks
      WHERE id = ?
      LIMIT 1;
    `,
    [deckId],
  );

  if (!deck) {
    return null;
  }

  const cards = await database.getAllAsync<CardRow>(
    `
      SELECT
        c.*,
        rs.ease_score,
        rs.easy_count,
        rs.hard_count,
        rs.last_reviewed_at,
        rs.due_at,
        rs.last_result
      FROM cards c
      LEFT JOIN review_stats rs ON rs.card_id = c.id
      WHERE c.deck_id = ?
      ORDER BY c.sort_order ASC, c.created_at ASC;
    `,
    [deckId],
  );

  return {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    tags: parseTags(deck.tags_json),
    sourceType: deck.source_type,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
    lastStudiedAt: deck.last_studied_at,
    cards: cards.map((card) => ({
      id: card.id,
      deckId: card.deck_id,
      term: card.term,
      definition: card.definition,
      example: card.example,
      sortOrder: card.sort_order,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      reviewStats: parseReviewStats(card),
    })),
  };
}

async function getTestAttemptSyncRecord(attemptId: string): Promise<SyncTestAttemptRecord | null> {
  const database = await getDatabase();
  const attempt = await database.getFirstAsync<TestAttemptRow>(
    `
      SELECT *
      FROM test_attempts
      WHERE id = ?
      LIMIT 1;
    `,
    [attemptId],
  );

  if (!attempt) {
    return null;
  }

  const questions = await database.getAllAsync<TestQuestionRow>(
    `
      SELECT *
      FROM test_questions
      WHERE attempt_id = ?
      ORDER BY created_at ASC, id ASC;
    `,
    [attemptId],
  );

  return {
    attempt: {
      id: attempt.id,
      deckId: attempt.deck_id,
      deckTitle: attempt.deck_title,
      totalQuestions: attempt.total_questions,
      correctAnswers: attempt.correct_answers,
      objectiveCorrect: attempt.objective_correct,
      objectiveTotal: attempt.objective_total,
      writtenCount: attempt.written_count,
      scorePercent: attempt.score_percent,
      startedAt: attempt.started_at,
      finishedAt: attempt.finished_at,
      weakCardCount: attempt.weak_card_count,
    },
    questions: questions.map((question) => ({
      id: question.id,
      attemptId: question.attempt_id,
      cardId: question.card_id,
      questionType: question.question_type,
      prompt: question.prompt,
      correctAnswer: question.correct_answer,
      selectedAnswer: question.selected_answer,
      options: parseOptions(question.options_json),
      isCorrect: question.is_correct === null ? null : question.is_correct === 1,
      explanation: question.explanation,
      createdAt: question.created_at,
    })),
  };
}

async function upsertQueueEntry(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation,
  payload: unknown,
): Promise<void> {
  const database = await getDatabase();
  const timestamp = nowIso();
  const queueId = `${entityType}:${entityId}`;

  await database.runAsync(
    `
      INSERT INTO sync_queue (
        id,
        entity_type,
        entity_id,
        operation,
        payload_json,
        created_at,
        updated_at,
        retry_count,
        last_error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)
      ON CONFLICT(entity_type, entity_id)
      DO UPDATE SET
        id = excluded.id,
        operation = excluded.operation,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at,
        last_error = NULL;
    `,
    [queueId, entityType, entityId, operation, JSON.stringify(payload), timestamp, timestamp],
  );
}

export async function enqueueDeckUpsert(deckId: string): Promise<void> {
  const record = await getDeckSyncRecord(deckId);

  if (!record) {
    return;
  }

  await upsertQueueEntry("deck", deckId, "upsert", record);
}

export async function enqueueDeckDelete(deckId: string): Promise<void> {
  await upsertQueueEntry("deck", deckId, "delete", { id: deckId });
}

export async function enqueueTestAttemptUpsert(attemptId: string): Promise<void> {
  const record = await getTestAttemptSyncRecord(attemptId);

  if (!record) {
    return;
  }

  await upsertQueueEntry("test_attempt", attemptId, "upsert", record);
}

export async function getPendingSyncQueue(): Promise<SyncQueueEntry[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<QueueRow>(
    `
      SELECT *
      FROM sync_queue
      ORDER BY updated_at ASC, created_at ASC;
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    retryCount: row.retry_count,
    lastError: row.last_error,
  }));
}

export async function acknowledgeSyncQueueEntries(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const database = await getDatabase();
  const placeholders = ids.map(() => "?").join(", ");
  await database.runAsync(`DELETE FROM sync_queue WHERE id IN (${placeholders});`, ids);
}

export async function markSyncQueueEntriesFailed(ids: string[], errorMessage: string): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const database = await getDatabase();
  const placeholders = ids.map(() => "?").join(", ");
  await database.runAsync(
    `
      UPDATE sync_queue
      SET retry_count = retry_count + 1,
          last_error = ?
      WHERE id IN (${placeholders});
    `,
    [errorMessage, ...ids],
  );
}

async function applyRemoteDeckRecord(record: SyncDeckRecord): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        INSERT INTO decks (id, title, description, tags_json, source_type, created_at, updated_at, last_studied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id)
        DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          tags_json = excluded.tags_json,
          source_type = excluded.source_type,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          last_studied_at = excluded.last_studied_at;
      `,
      [
        record.id,
        record.title,
        record.description,
        JSON.stringify(record.tags),
        record.sourceType,
        record.createdAt,
        record.updatedAt,
        record.lastStudiedAt,
      ],
    );

    const existingCards = await database.getAllAsync<{ id: string }>("SELECT id FROM cards WHERE deck_id = ?;", [record.id]);
    const nextCardIds = new Set<string>();

    for (const card of record.cards) {
      nextCardIds.add(card.id);

      await database.runAsync(
        `
          INSERT INTO cards (id, deck_id, term, definition, example, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id)
          DO UPDATE SET
            deck_id = excluded.deck_id,
            term = excluded.term,
            definition = excluded.definition,
            example = excluded.example,
            sort_order = excluded.sort_order,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at;
        `,
        [
          card.id,
          record.id,
          card.term,
          card.definition,
          card.example,
          card.sortOrder,
          card.createdAt,
          card.updatedAt,
        ],
      );

      if (card.reviewStats) {
        await database.runAsync(
          `
            INSERT INTO review_stats (
              card_id,
              deck_id,
              ease_score,
              easy_count,
              hard_count,
              last_reviewed_at,
              due_at,
              last_result
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(card_id)
            DO UPDATE SET
              deck_id = excluded.deck_id,
              ease_score = excluded.ease_score,
              easy_count = excluded.easy_count,
              hard_count = excluded.hard_count,
              last_reviewed_at = excluded.last_reviewed_at,
              due_at = excluded.due_at,
              last_result = excluded.last_result;
          `,
          [
            card.id,
            record.id,
            card.reviewStats.easeScore,
            card.reviewStats.easyCount,
            card.reviewStats.hardCount,
            card.reviewStats.lastReviewedAt,
            card.reviewStats.dueAt,
            card.reviewStats.lastResult,
          ],
        );
      }
    }

    for (const existingCard of existingCards) {
      if (!nextCardIds.has(existingCard.id)) {
        await database.runAsync("DELETE FROM cards WHERE id = ? AND deck_id = ?;", [existingCard.id, record.id]);
      }
    }
  });
}

async function applyRemoteTestAttemptRecord(record: SyncTestAttemptRecord): Promise<void> {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        INSERT INTO test_attempts (
          id,
          deck_id,
          deck_title,
          total_questions,
          correct_answers,
          objective_correct,
          objective_total,
          written_count,
          score_percent,
          started_at,
          finished_at,
          weak_card_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id)
        DO UPDATE SET
          deck_id = excluded.deck_id,
          deck_title = excluded.deck_title,
          total_questions = excluded.total_questions,
          correct_answers = excluded.correct_answers,
          objective_correct = excluded.objective_correct,
          objective_total = excluded.objective_total,
          written_count = excluded.written_count,
          score_percent = excluded.score_percent,
          started_at = excluded.started_at,
          finished_at = excluded.finished_at,
          weak_card_count = excluded.weak_card_count;
      `,
      [
        record.attempt.id,
        record.attempt.deckId,
        record.attempt.deckTitle,
        record.attempt.totalQuestions,
        record.attempt.correctAnswers,
        record.attempt.objectiveCorrect,
        record.attempt.objectiveTotal,
        record.attempt.writtenCount,
        record.attempt.scorePercent,
        record.attempt.startedAt,
        record.attempt.finishedAt,
        record.attempt.weakCardCount,
      ],
    );

    await database.runAsync("DELETE FROM test_questions WHERE attempt_id = ?;", [record.attempt.id]);

    for (const question of record.questions) {
      await database.runAsync(
        `
          INSERT INTO test_questions (
            id,
            attempt_id,
            card_id,
            question_type,
            prompt,
            correct_answer,
            selected_answer,
            options_json,
            is_correct,
            explanation,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          question.id,
          record.attempt.id,
          question.cardId,
          question.questionType,
          question.prompt,
          question.correctAnswer,
          question.selectedAnswer,
          question.options ? JSON.stringify(question.options) : null,
          typeof question.isCorrect === "boolean" ? (question.isCorrect ? 1 : 0) : null,
          question.explanation,
          question.createdAt,
        ],
      );
    }
  });
}

export async function applyRemoteChangeSet(changeSet: SyncChangeSet): Promise<void> {
  for (const deckId of changeSet.deletedDeckIds) {
    const database = await getDatabase();
    await database.runAsync("DELETE FROM decks WHERE id = ?;", [deckId]);
  }

  for (const deck of changeSet.decks) {
    await applyRemoteDeckRecord(deck);
  }

  for (const testAttempt of changeSet.testAttempts) {
    await applyRemoteTestAttemptRecord(testAttempt);
  }
}
