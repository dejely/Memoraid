import { getDatabase } from "../client";
import { getDeckSummaries } from "./deck-repository";
import { getRecentTestAttempts } from "./test-repository";
import type { ActivityItem, DashboardData, DueCard } from "../../types/models";

export async function getDueCards(limit = 10): Promise<DueCard[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    card_id: string;
    deck_id: string;
    deck_title: string;
    term: string;
    due_at: string | null;
  }>(
    `
      SELECT
        rs.card_id,
        rs.deck_id,
        d.title AS deck_title,
        c.term,
        rs.due_at
      FROM review_stats rs
      INNER JOIN decks d ON d.id = rs.deck_id
      INNER JOIN cards c ON c.id = rs.card_id
      WHERE rs.due_at IS NOT NULL AND rs.due_at <= ?
      ORDER BY rs.due_at ASC
      LIMIT ?;
    `,
    [new Date().toISOString(), limit],
  );

  return rows.map((row) => ({
    cardId: row.card_id,
    deckId: row.deck_id,
    deckTitle: row.deck_title,
    term: row.term,
    dueAt: row.due_at,
  }));
}

export async function getRecentStudyActivity(limit = 10): Promise<ActivityItem[]> {
  const database = await getDatabase();
  const studyRows = await database.getAllAsync<{
    id: string;
    deck_title: string;
    updated_at: string;
    current_index: number;
    completed_at: string | null;
  }>(
    `
      SELECT
        s.id,
        d.title AS deck_title,
        s.updated_at,
        s.current_index,
        s.completed_at
      FROM sessions s
      INNER JOIN decks d ON d.id = s.deck_id
      ORDER BY s.updated_at DESC
      LIMIT ?;
    `,
    [limit],
  );
  const testAttempts = await getRecentTestAttempts(limit);

  const studyActivity = studyRows.map<ActivityItem>((row) => ({
    id: row.id,
    type: "study",
    title: row.deck_title,
    subtitle: row.completed_at ? "Completed a flashcard run" : `Resumed at card ${row.current_index + 1}`,
    happenedAt: row.updated_at,
  }));
  const testActivity = testAttempts.map<ActivityItem>((attempt) => ({
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

  return {
    decks,
    recentActivity,
    dueCards,
    testHistory,
  };
}
