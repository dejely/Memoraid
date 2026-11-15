import type { ReviewResult, ReviewStats } from "../../types/models";
export function calculateNextState(existing: ReviewStats | null, result: ReviewResult, timestamp: string): ReviewStats {
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
  const easyCount = baseline.easyCount + Number(result === "easy");
  const hardCount = baseline.hardCount + Number(result === "hard" || result === "incorrect");
  let easeScore = baseline.easeScore,
    delayHours = 12;
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
    easyCount,
    hardCount,
    easeScore,
    dueAt: new Date(Date.parse(timestamp) + delayHours * 3600000).toISOString(),
    lastReviewedAt: timestamp,
    lastResult: result,
  };
}
