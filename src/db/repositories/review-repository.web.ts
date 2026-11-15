import type { ReviewResult, ReviewStats } from "../../types/models";
import { createId } from "../../utils/ids";
import { studyDay } from "../../features/progress/model";
import type { GradingMethod } from "../../services/math/grading";
import { cloudDatabase, throwIfCloudError } from "./supabase-helpers.web";
export async function getReviewStats(cardId: string): Promise<ReviewStats | null> {
  const { data, error } = await cloudDatabase().from("review_stats").select("*").eq("card_id", cardId).maybeSingle();
  throwIfCloudError(error, "Review progress could not be loaded");
  return data
    ? {
        cardId: data.card_id,
        deckId: data.deck_id,
        easeScore: data.ease_score,
        easyCount: data.easy_count,
        hardCount: data.hard_count,
        lastReviewedAt: data.last_reviewed_at,
        dueAt: data.due_at,
        lastResult: data.last_result,
      }
    : null;
}
export async function recordReview(
  cardId: string,
  deckId: string,
  result: ReviewResult,
  eventId = createId("review"),
  method: GradingMethod = "self_review",
): Promise<void> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const response = await cloudDatabase().rpc("record_study_review", {
    p_id: eventId,
    p_card_id: cardId,
    p_deck_id: deckId,
    p_result: result,
    p_day: studyDay(new Date(), timezone),
    p_timezone: timezone,
    p_method: method,
  });
  throwIfCloudError(response.error, "Review progress could not be saved");
}
