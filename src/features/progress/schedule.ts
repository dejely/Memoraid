import { createEmptyCard, fsrs, Rating, type CardInput } from "ts-fsrs";
import type { ReviewResult, ReviewStats } from "../../types/models";
import type { ReviewEvent } from "./model";
const scheduler = fsrs({ enable_fuzz: false });
const ratings = {
  incorrect: Rating.Again,
  correct: Rating.Good,
  hard: Rating.Hard,
  easy: Rating.Easy,
} as const;
export function initializeSchedule(
  existing: ReviewStats | null,
  at: string,
): CardInput {
  return existing?.fsrs ?? createEmptyCard(new Date(existing?.dueAt ?? at));
}
export function calculateNextState(
  existing: ReviewStats | null,
  result: ReviewResult,
  timestamp: string,
): ReviewStats {
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
  const next = scheduler.next(
    initializeSchedule(existing, timestamp),
    new Date(timestamp),
    ratings[result],
  ).card;
  return {
    ...baseline,
    fsrs: JSON.parse(JSON.stringify(next)),
    dueAt: next.due.toISOString(),
    lastReviewedAt: timestamp,
    lastResult: result,
    easyCount: baseline.easyCount + Number(result === "easy"),
    hardCount:
      baseline.hardCount + Number(result === "hard" || result === "incorrect"),
  };
}
export function replaySchedule(
  baseline: ReviewStats | null,
  events: ReviewEvent[],
) {
  let state = baseline;
  const unique = new Map(events.map((event) => [event.id, event]));
  for (const event of [...unique.values()]
    .filter(
      (e) =>
        !baseline?.lastReviewedAt ||
        Date.parse(e.happened_at) > Date.parse(baseline.lastReviewedAt),
    )
    .sort(
      (a, b) =>
        Date.parse(a.happened_at) - Date.parse(b.happened_at) ||
        a.id.localeCompare(b.id),
    )) {
    state = {
      ...calculateNextState(state, event.result, event.happened_at),
      cardId: event.card_id,
      deckId: event.deck_id,
    };
  }
  return state;
}
