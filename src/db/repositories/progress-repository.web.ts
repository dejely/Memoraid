import { topicMastery, summarizeProgress, type ReviewEvent } from "../../features/progress/model";
import { cloudDatabase, jsonStringArray, throwIfCloudError } from "./supabase-helpers.web";
async function allRows(table: string, columns: string) {
  const rows: Record<string, any>[] = [];
  for (let start = 0; ; start += 500) {
    const result = await cloudDatabase()
      .from(table)
      .select(columns)
      .order("id")
      .range(start, start + 499);
    throwIfCloudError(result.error, "Study progress could not be loaded");
    rows.push(...((result.data as unknown as Record<string, any>[]) ?? []));
    if (!result.data || result.data.length < 500) return rows;
  }
}
export async function getStudyProgress() {
  const [events, cards, decks] = await Promise.all([
    allRows("review_events", "*"),
    allRows("cards", "id,deck_id"),
    allRows("decks", "id,tags_json"),
  ]);
  return {
    ...summarizeProgress(events as ReviewEvent[]),
    topics: topicMastery(
      events as ReviewEvent[],
      cards as { id: string; deck_id: string }[],
      decks.map((deck) => ({ id: deck.id, tags: jsonStringArray(deck.tags_json) })),
    ),
  };
}
