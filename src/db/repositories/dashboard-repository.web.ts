import type { ActivityItem, DashboardData, DueCard } from "../../types/models";
import { nowIso } from "../../utils/date";
import { getDeckSummaries } from "./deck-repository";
import { cloudDatabase, throwIfCloudError } from "./supabase-helpers.web";
import { getRecentTestAttempts } from "./test-repository";

export async function getDueCards(limit = 10): Promise<DueCard[]> {
  const client = cloudDatabase();
  const reviewsResult = await client
    .from("review_stats")
    .select("card_id,deck_id,due_at")
    .lte("due_at", nowIso())
    .order("due_at", { ascending: true })
    .limit(limit);
  throwIfCloudError(reviewsResult.error, "Due cards could not be loaded");

  const reviews = reviewsResult.data ?? [];

  if (reviews.length === 0) {
    return [];
  }

  const [cardsResult, decksResult] = await Promise.all([
    client.from("cards").select("id,term").in("id", reviews.map((row) => row.card_id)),
    client.from("decks").select("id,title").in("id", reviews.map((row) => row.deck_id)),
  ]);
  throwIfCloudError(cardsResult.error, "Due-card terms could not be loaded");
  throwIfCloudError(decksResult.error, "Due-card study sets could not be loaded");

  const cards = new Map((cardsResult.data ?? []).map((row) => [row.id, row.term]));
  const decks = new Map((decksResult.data ?? []).map((row) => [row.id, row.title]));

  return reviews.flatMap((review) => {
    const term = cards.get(review.card_id);
    const deckTitle = decks.get(review.deck_id);

    return term && deckTitle
      ? [{ cardId: review.card_id, deckId: review.deck_id, deckTitle, term, dueAt: review.due_at }]
      : [];
  });
}

export async function getRecentStudyActivity(limit = 10): Promise<ActivityItem[]> {
  const client = cloudDatabase();
  const [sessionsResult, attempts] = await Promise.all([
    client
      .from("sessions")
      .select("id,deck_id,updated_at,current_index,completed_at")
      .order("updated_at", { ascending: false })
      .limit(limit),
    getRecentTestAttempts(limit),
  ]);
  throwIfCloudError(sessionsResult.error, "Study activity could not be loaded");

  const sessions = sessionsResult.data ?? [];
  const decksResult = sessions.length
    ? await client.from("decks").select("id,title").in("id", sessions.map((row) => row.deck_id))
    : { data: [], error: null };
  throwIfCloudError(decksResult.error, "Study-set titles could not be loaded");
  const titles = new Map((decksResult.data ?? []).map((row) => [row.id, row.title]));

  const studyActivity = sessions.flatMap<ActivityItem>((row) => {
    const title = titles.get(row.deck_id);

    return title
      ? [
          {
            id: row.id,
            type: "study",
            title,
            subtitle: row.completed_at ? "Completed a flashcard run" : `Resumed at card ${row.current_index + 1}`,
            happenedAt: row.updated_at,
          },
        ]
      : [];
  });
  const testActivity = attempts.map<ActivityItem>((attempt) => ({
    id: attempt.id,
    type: "test",
    title: attempt.deckTitle,
    subtitle: `Scored ${attempt.scorePercent}% on ${attempt.totalQuestions} questions`,
    happenedAt: attempt.finishedAt,
  }));

  return [...studyActivity, ...testActivity]
    .sort((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt))
    .slice(0, limit);
}

export async function getDashboardData(): Promise<DashboardData> {
  const [decks, recentActivity, dueCards, testHistory] = await Promise.all([
    getDeckSummaries(),
    getRecentStudyActivity(8),
    getDueCards(6),
    getRecentTestAttempts(6),
  ]);

  return { decks, recentActivity, dueCards, testHistory };
}

