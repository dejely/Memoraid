import { getDatabase } from "../client";
import { topicMastery, summarizeProgress, type ReviewEvent } from "../../features/progress/model";
export async function getStudyProgress() {
  const database = await getDatabase();
  const [events, cards, decks] = await Promise.all([
    database.getAllAsync<ReviewEvent>("SELECT * FROM review_events"),
    database.getAllAsync<{ id: string; deck_id: string }>("SELECT id, deck_id FROM cards"),
    database.getAllAsync<{ id: string; tags_json: string }>("SELECT id, tags_json FROM decks"),
  ]);
  return {
    ...summarizeProgress(events),
    topics: topicMastery(
      events,
      cards,
      decks.map((deck) => ({ id: deck.id, tags: JSON.parse(deck.tags_json) })),
    ),
  };
}
