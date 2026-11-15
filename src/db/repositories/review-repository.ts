import { getDatabase } from "../client";
import type { ReviewResult, ReviewStats } from "../../types/models";
import { createId } from "../../utils/ids";
import { calculateNextState } from "../../features/progress/schedule";
import { studyDay } from "../../features/progress/model";
import type { GradingMethod } from "../../services/math/grading";
const columns = `card_id AS cardId, deck_id AS deckId, ease_score AS easeScore, easy_count AS easyCount, hard_count AS hardCount, last_reviewed_at AS lastReviewedAt, due_at AS dueAt, last_result AS lastResult`;
export async function getReviewStats(cardId: string): Promise<ReviewStats | null> {
  return (await getDatabase()).getFirstAsync<ReviewStats>(`SELECT ${columns} FROM review_stats WHERE card_id = ?`, [
    cardId,
  ]);
}
async function commitReview(
  cardId: string,
  deckId: string,
  result: ReviewResult,
  eventId = createId("review"),
  method: GradingMethod = "self_review",
): Promise<void> {
  const database = await getDatabase();
  await database.withExclusiveTransactionAsync(async (tx) => {
    if (await tx.getFirstAsync("SELECT id FROM review_events WHERE id = ?", [eventId])) return;
    const existing = await tx.getFirstAsync<ReviewStats>(`SELECT ${columns} FROM review_stats WHERE card_id = ?`, [
      cardId,
    ]);
    const timestamp = new Date().toISOString(),
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const next = calculateNextState(existing, result, timestamp);
    await tx.runAsync(
      `INSERT INTO review_stats (card_id,deck_id,ease_score,easy_count,hard_count,last_reviewed_at,due_at,last_result) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(card_id) DO UPDATE SET ease_score=excluded.ease_score,easy_count=excluded.easy_count,hard_count=excluded.hard_count,last_reviewed_at=excluded.last_reviewed_at,due_at=excluded.due_at,last_result=excluded.last_result`,
      [cardId, deckId, next.easeScore, next.easyCount, next.hardCount, timestamp, next.dueAt, result],
    );
    await tx.runAsync(
      `INSERT INTO review_events (id,card_id,deck_id,result,happened_at,study_date,timezone,was_due,was_weak,grading_method) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        eventId,
        cardId,
        deckId,
        result,
        timestamp,
        studyDay(new Date(timestamp), timezone),
        timezone,
        Number(!!existing?.dueAt && Date.parse(existing.dueAt) <= Date.parse(timestamp)),
        Number(existing?.lastResult === "hard" || existing?.lastResult === "incorrect"),
        method,
      ],
    );
  });
}

// Serialize native writes; retries keep their original event ID.
let reviewQueue: Promise<void> = Promise.resolve();
export function recordReview(
  cardId: string,
  deckId: string,
  result: ReviewResult,
  eventId = createId("review"),
  method: GradingMethod = "self_review",
): Promise<void> {
  const pending = reviewQueue.then(() => commitReview(cardId, deckId, result, eventId, method));
  reviewQueue = pending.catch(() => {});
  return pending;
}
