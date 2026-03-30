import { getDatabase } from "../client";
import { mapSessionRow } from "../mappers";
import { nowIso } from "../../utils/date";
import { createId } from "../../utils/ids";
import type { FlashcardSession } from "../../types/models";

type SessionInput = {
  deckId: string;
  currentIndex: number;
  order: string[];
  shuffleEnabled: boolean;
  easyCount: number;
  hardCount: number;
  completedAt?: string | null;
  sessionId?: string | null;
  startedAt?: string | null;
};

export async function getFlashcardSession(deckId: string): Promise<FlashcardSession | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    deck_id: string;
    mode: "flashcard";
    current_index: number;
    order_json: string;
    shuffle_enabled: number;
    easy_count: number;
    hard_count: number;
    started_at: string;
    updated_at: string;
    completed_at: string | null;
  }>(
    `
      SELECT *
      FROM sessions
      WHERE deck_id = ? AND mode = 'flashcard'
      LIMIT 1;
    `,
    [deckId],
  );

  return row ? mapSessionRow(row) : null;
}

export async function saveFlashcardSession(input: SessionInput): Promise<FlashcardSession> {
  const database = await getDatabase();
  const existingSession = await getFlashcardSession(input.deckId);
  const timestamp = nowIso();
  const startedAt = input.startedAt ?? existingSession?.startedAt ?? timestamp;
  const sessionId = input.sessionId ?? existingSession?.id ?? createId("session");

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        INSERT INTO sessions (
          id,
          deck_id,
          mode,
          current_index,
          order_json,
          shuffle_enabled,
          easy_count,
          hard_count,
          started_at,
          updated_at,
          completed_at
        )
        VALUES (?, ?, 'flashcard', ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(deck_id, mode)
        DO UPDATE SET
          id = excluded.id,
          current_index = excluded.current_index,
          order_json = excluded.order_json,
          shuffle_enabled = excluded.shuffle_enabled,
          easy_count = excluded.easy_count,
          hard_count = excluded.hard_count,
          started_at = excluded.started_at,
          updated_at = excluded.updated_at,
          completed_at = excluded.completed_at;
      `,
      [
        sessionId,
        input.deckId,
        input.currentIndex,
        JSON.stringify(input.order),
        input.shuffleEnabled ? 1 : 0,
        input.easyCount,
        input.hardCount,
        startedAt,
        timestamp,
        input.completedAt ?? null,
      ],
    );

    await database.runAsync("UPDATE decks SET last_studied_at = ?, updated_at = ? WHERE id = ?;", [
      timestamp,
      timestamp,
      input.deckId,
    ]);
  });

  const savedSession = await getFlashcardSession(input.deckId);

  if (!savedSession) {
    throw new Error("Failed to save the flashcard session.");
  }

  return savedSession;
}
