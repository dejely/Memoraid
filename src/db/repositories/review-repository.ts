import { getDatabase } from "../client";
import { nowIso } from "../../utils/date";
import type { ReviewResult, ReviewStats } from "../../types/models";

function calculateNextState(existing: ReviewStats | null, result: ReviewResult, timestamp: string): ReviewStats {
  const baseline = existing ?? {
    cardId: "",
    deckId: "",
    easeScore: 2.5,
    easyCount: 0,
    hardCount: 0,
    lastReviewedAt: null,
    dueAt: null,
    lastResult: null,
  };

  const easyCount = baseline.easyCount + (result === "easy" ? 1 : 0);
  const hardCount = baseline.hardCount + (result === "hard" || result === "incorrect" ? 1 : 0);
  let easeScore = baseline.easeScore;
  let delayHours = 12;

  if (result === "easy") {
    easeScore = Math.min(5, easeScore + 0.35);
    delayHours = Math.max(24, Math.round((easyCount + 1) * 18 * easeScore));
  } else if (result === "correct") {
    easeScore = Math.min(5, easeScore + 0.2);
    delayHours = Math.max(18, Math.round(24 * easeScore));
  } else if (result === "hard") {
    easeScore = Math.max(1.3, easeScore - 0.4);
    delayHours = 8;
  } else {
    easeScore = Math.max(1.2, easeScore - 0.55);
    delayHours = 4;
  }

  return {
    ...baseline,
    easeScore,
    easyCount,
    hardCount,
    lastReviewedAt: timestamp,
    dueAt: new Date(Date.parse(timestamp) + delayHours * 60 * 60 * 1000).toISOString(),
    lastResult: result,
  };
}

export async function getReviewStats(cardId: string): Promise<ReviewStats | null> {
  const database = await getDatabase();

  return database.getFirstAsync<ReviewStats>(
    `
      SELECT
        card_id AS cardId,
        deck_id AS deckId,
        ease_score AS easeScore,
        easy_count AS easyCount,
        hard_count AS hardCount,
        last_reviewed_at AS lastReviewedAt,
        due_at AS dueAt,
        last_result AS lastResult
      FROM review_stats
      WHERE card_id = ?
      LIMIT 1;
    `,
    [cardId],
  );
}

export async function recordReview(cardId: string, deckId: string, result: ReviewResult): Promise<void> {
  const database = await getDatabase();
  const existing = await getReviewStats(cardId);
  const timestamp = nowIso();
  const nextState = calculateNextState(existing, result, timestamp);

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
      cardId,
      deckId,
      nextState.easeScore,
      nextState.easyCount,
      nextState.hardCount,
      nextState.lastReviewedAt,
      nextState.dueAt,
      nextState.lastResult,
    ],
  );
}
