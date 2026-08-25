import type { ReviewResult, ReviewStats } from "../../types/models";
import { nowIso } from "../../utils/date";
import { cloudDatabase, requireCloudUser, throwIfCloudError } from "./supabase-helpers.web";

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
  const result = await cloudDatabase()
    .from("review_stats")
    .select("card_id,deck_id,ease_score,easy_count,hard_count,last_reviewed_at,due_at,last_result")
    .eq("card_id", cardId)
    .maybeSingle();
  throwIfCloudError(result.error, "Review progress could not be loaded");

  if (!result.data) {
    return null;
  }

  return {
    cardId: result.data.card_id,
    deckId: result.data.deck_id,
    easeScore: result.data.ease_score,
    easyCount: result.data.easy_count,
    hardCount: result.data.hard_count,
    lastReviewedAt: result.data.last_reviewed_at,
    dueAt: result.data.due_at,
    lastResult: result.data.last_result as ReviewStats["lastResult"],
  };
}

export async function recordReview(cardId: string, deckId: string, result: ReviewResult): Promise<void> {
  const [existing, user] = await Promise.all([getReviewStats(cardId), requireCloudUser()]);
  const nextState = calculateNextState(existing, result, nowIso());
  const upsertResult = await cloudDatabase().from("review_stats").upsert(
    {
      user_id: user.id,
      card_id: cardId,
      deck_id: deckId,
      ease_score: nextState.easeScore,
      easy_count: nextState.easyCount,
      hard_count: nextState.hardCount,
      last_reviewed_at: nextState.lastReviewedAt,
      due_at: nextState.dueAt,
      last_result: nextState.lastResult,
    },
    { onConflict: "user_id,card_id" },
  );
  throwIfCloudError(upsertResult.error, "Review progress could not be saved");
}

