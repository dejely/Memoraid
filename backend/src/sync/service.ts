import type { PoolClient } from "pg";
import { z } from "zod";

import { pool } from "../db/pool.js";
import {
  syncChangeSchema,
  syncDeckRecordSchema,
  syncTestAttemptRecordSchema,
  type PushBody,
  type SyncChange,
  type SyncChangeSet,
  type SyncDeckRecord,
  type SyncTestAttemptRecord,
} from "./schemas.js";

const deckDeletePayloadSchema = z.object({
  id: z.string().min(1),
});

type EventRow = {
  sequence: string;
  entity_type: "deck" | "test_attempt";
  entity_id: string;
  operation: "upsert" | "delete";
  payload_json: unknown;
};

function parseCursor(cursor: string | null | undefined): string {
  return cursor && /^\d+$/.test(cursor) ? cursor : "0";
}

async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function recordSyncEvent(client: PoolClient, change: SyncChange): Promise<void> {
  await client.query(
    `
      INSERT INTO sync_events (entity_type, entity_id, operation, payload_json)
      VALUES ($1, $2, $3, $4::jsonb);
    `,
    [change.entityType, change.entityId, change.operation, JSON.stringify(change.payload)],
  );
}

async function applyDeckSnapshot(client: PoolClient, deck: SyncDeckRecord): Promise<void> {
  await client.query(
    `
      INSERT INTO decks (id, title, description, tags_json, source_type, created_at, updated_at, last_studied_at)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
      ON CONFLICT(id)
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        tags_json = EXCLUDED.tags_json,
        source_type = EXCLUDED.source_type,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at,
        last_studied_at = EXCLUDED.last_studied_at;
    `,
    [
      deck.id,
      deck.title,
      deck.description,
      JSON.stringify(deck.tags),
      deck.sourceType,
      deck.createdAt,
      deck.updatedAt,
      deck.lastStudiedAt,
    ],
  );

  for (const card of deck.cards) {
    await client.query(
      `
        INSERT INTO cards (id, deck_id, term, definition, example, sort_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT(id)
        DO UPDATE SET
          deck_id = EXCLUDED.deck_id,
          term = EXCLUDED.term,
          definition = EXCLUDED.definition,
          example = EXCLUDED.example,
          sort_order = EXCLUDED.sort_order,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at;
      `,
      [card.id, deck.id, card.term, card.definition, card.example, card.sortOrder, card.createdAt, card.updatedAt],
    );

    if (card.reviewStats) {
      await client.query(
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT(card_id)
          DO UPDATE SET
            deck_id = EXCLUDED.deck_id,
            ease_score = EXCLUDED.ease_score,
            easy_count = EXCLUDED.easy_count,
            hard_count = EXCLUDED.hard_count,
            last_reviewed_at = EXCLUDED.last_reviewed_at,
            due_at = EXCLUDED.due_at,
            last_result = EXCLUDED.last_result;
        `,
        [
          card.id,
          deck.id,
          card.reviewStats.easeScore,
          card.reviewStats.easyCount,
          card.reviewStats.hardCount,
          card.reviewStats.lastReviewedAt,
          card.reviewStats.dueAt,
          card.reviewStats.lastResult,
        ],
      );
    } else {
      await client.query("DELETE FROM review_stats WHERE card_id = $1;", [card.id]);
    }
  }

  const nextCardIds = deck.cards.map((card) => card.id);
  await client.query("DELETE FROM cards WHERE deck_id = $1 AND id <> ALL($2::text[]);", [deck.id, nextCardIds]);
}

async function applyDeckDelete(client: PoolClient, deckId: string): Promise<void> {
  await client.query("DELETE FROM decks WHERE id = $1;", [deckId]);
}

async function applyTestAttemptSnapshot(client: PoolClient, record: SyncTestAttemptRecord): Promise<void> {
  await client.query(
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT(id)
      DO UPDATE SET
        deck_id = EXCLUDED.deck_id,
        deck_title = EXCLUDED.deck_title,
        total_questions = EXCLUDED.total_questions,
        correct_answers = EXCLUDED.correct_answers,
        objective_correct = EXCLUDED.objective_correct,
        objective_total = EXCLUDED.objective_total,
        written_count = EXCLUDED.written_count,
        score_percent = EXCLUDED.score_percent,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at,
        weak_card_count = EXCLUDED.weak_card_count;
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

  await client.query("DELETE FROM test_questions WHERE attempt_id = $1;", [record.attempt.id]);

  for (const question of record.questions) {
    await client.query(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11);
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
        question.isCorrect,
        question.explanation,
        question.createdAt,
      ],
    );
  }
}

async function applyChange(client: PoolClient, change: SyncChange): Promise<void> {
  if (change.entityType === "deck" && change.operation === "upsert") {
    await applyDeckSnapshot(client, change.payload);
  } else if (change.entityType === "deck" && change.operation === "delete") {
    await applyDeckDelete(client, change.payload.id);
  } else if (change.entityType === "test_attempt" && change.operation === "upsert") {
    await applyTestAttemptSnapshot(client, change.payload);
  } else {
    const unsupported: never = change;
    throw new Error(`Unsupported sync change: ${JSON.stringify(unsupported)}`);
  }

  await recordSyncEvent(client, change);
}

export async function pushChanges(body: PushBody): Promise<{ acknowledgedIds: string[]; cursor: string }> {
  const changes = body.changes.map((change) => syncChangeSchema.parse(change));

  await withTransaction(async (client) => {
    for (const change of changes) {
      await applyChange(client, change);
    }
  });

  const cursorResult = await pool.query<{ cursor: string }>(
    "SELECT COALESCE(MAX(sequence), 0)::text AS cursor FROM sync_events;",
  );

  return {
    acknowledgedIds: changes.map((change) => change.id),
    cursor: cursorResult.rows[0]?.cursor ?? parseCursor(body.cursor),
  };
}

function aggregateChanges(rows: EventRow[]): SyncChangeSet {
  const decks = new Map<string, SyncDeckRecord>();
  const deletedDeckIds = new Set<string>();
  const testAttempts = new Map<string, SyncTestAttemptRecord>();

  for (const row of rows) {
    if (row.entity_type === "deck" && row.operation === "upsert") {
      const deck = syncDeckRecordSchema.parse(row.payload_json);
      decks.set(deck.id, deck);
      deletedDeckIds.delete(deck.id);
      continue;
    }

    if (row.entity_type === "deck" && row.operation === "delete") {
      const payload = deckDeletePayloadSchema.parse(row.payload_json);
      deletedDeckIds.add(payload.id);
      decks.delete(payload.id);
      continue;
    }

    if (row.entity_type === "test_attempt" && row.operation === "upsert") {
      const attempt = syncTestAttemptRecordSchema.parse(row.payload_json);
      testAttempts.set(attempt.attempt.id, attempt);
    }
  }

  return {
    decks: [...decks.values()],
    deletedDeckIds: [...deletedDeckIds.values()],
    testAttempts: [...testAttempts.values()],
  };
}

export async function pullChanges(cursor: string | null | undefined): Promise<{ cursor: string; changes: SyncChangeSet }> {
  const parsedCursor = parseCursor(cursor);
  const result = await pool.query<EventRow>(
    `
      SELECT sequence::text, entity_type, entity_id, operation, payload_json
      FROM sync_events
      WHERE sequence > $1::bigint
      ORDER BY sequence ASC;
    `,
    [parsedCursor],
  );

  const nextCursor = result.rows.length > 0 ? result.rows[result.rows.length - 1].sequence : parsedCursor;

  return {
    cursor: nextCursor,
    changes: aggregateChanges(result.rows),
  };
}
