import { getDatabase } from "../client";
import { mapCardRow, mapDeckSummaryRow } from "../mappers";
import { nowIso } from "../../utils/date";
import { createId } from "../../utils/ids";
import type { Deck, DeckDraft, DeckSummary, SourceType } from "../../types/models";

type DeckSummaryRow = {
  id: string;
  title: string;
  description: string;
  tags_json: string;
  card_count: number;
  due_count: number;
  updated_at: string;
  last_studied_at: string | null;
  source_type: "manual" | "imported";
};

const SUMMARY_QUERY = `
  SELECT
    d.id,
    d.title,
    d.description,
    d.tags_json,
    d.updated_at,
    d.last_studied_at,
    d.source_type,
    (
      SELECT COUNT(*)
      FROM cards c
      WHERE c.deck_id = d.id
    ) AS card_count,
    (
      SELECT COUNT(*)
      FROM review_stats rs
      WHERE rs.deck_id = d.id
        AND rs.due_at IS NOT NULL
        AND rs.due_at <= ?
    ) AS due_count
  FROM decks d
`;

function normalizeDraft(input: DeckDraft): DeckDraft & { sourceType: SourceType } {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    sourceType: input.sourceType ?? "manual",
    cards: input.cards
      .map((card) => ({
        id: card.id,
        term: card.term.trim(),
        definition: card.definition.trim(),
        example: card.example?.trim() ?? "",
      }))
      .filter((card) => card.term && card.definition),
  };
}

async function ensureReviewStatForCard(deckId: string, cardId: string, dueAt: string): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `
      INSERT INTO review_stats (card_id, deck_id, ease_score, easy_count, hard_count, last_reviewed_at, due_at, last_result)
      VALUES (?, ?, 2.5, 0, 0, NULL, ?, NULL)
      ON CONFLICT(card_id) DO NOTHING;
    `,
    [cardId, deckId, dueAt],
  );
}

export async function getDeckSummaries(): Promise<DeckSummary[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<DeckSummaryRow>(`${SUMMARY_QUERY} ORDER BY d.updated_at DESC;`, [nowIso()]);

  return rows.map(mapDeckSummaryRow);
}

export async function getDeckById(deckId: string): Promise<Deck | null> {
  const database = await getDatabase();
  const summary = await database.getFirstAsync<DeckSummaryRow>(`${SUMMARY_QUERY} WHERE d.id = ? LIMIT 1;`, [
    nowIso(),
    deckId,
  ]);

  if (!summary) {
    return null;
  }

  const cards = await database.getAllAsync<
    {
      id: string;
      deck_id: string;
      term: string;
      definition: string;
      example: string | null;
      sort_order: number;
      created_at: string;
      updated_at: string;
      ease_score: number | null;
      easy_count: number | null;
      hard_count: number | null;
      last_reviewed_at: string | null;
      due_at: string | null;
      last_result: "easy" | "hard" | "correct" | "incorrect" | null;
    }
  >(
    `
      SELECT
        c.*,
        rs.ease_score,
        rs.easy_count,
        rs.hard_count,
        rs.last_reviewed_at,
        rs.due_at,
        rs.last_result
      FROM cards c
      LEFT JOIN review_stats rs ON rs.card_id = c.id
      WHERE c.deck_id = ?
      ORDER BY c.sort_order ASC, c.created_at ASC;
    `,
    [deckId],
  );

  return {
    ...mapDeckSummaryRow(summary),
    cards: cards.map(mapCardRow),
  };
}

export async function createDeck(input: DeckDraft): Promise<string> {
  const database = await getDatabase();
  const draft = normalizeDraft(input);
  const timestamp = nowIso();
  const deckId = createId("deck");

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        INSERT INTO decks (id, title, description, tags_json, source_type, created_at, updated_at, last_studied_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL);
      `,
      [deckId, draft.title, draft.description, JSON.stringify(draft.tags), draft.sourceType, timestamp, timestamp],
    );

    for (const [index, card] of draft.cards.entries()) {
      const cardId = createId("card");

      await database.runAsync(
        `
          INSERT INTO cards (id, deck_id, term, definition, example, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [cardId, deckId, card.term, card.definition, card.example || null, index, timestamp, timestamp],
      );

      await ensureReviewStatForCard(deckId, cardId, timestamp);
    }
  });

  return deckId;
}

export async function updateDeck(deckId: string, input: DeckDraft): Promise<void> {
  const database = await getDatabase();
  const draft = normalizeDraft(input);
  const timestamp = nowIso();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
        UPDATE decks
        SET title = ?, description = ?, tags_json = ?, source_type = ?, updated_at = ?
        WHERE id = ?;
      `,
      [draft.title, draft.description, JSON.stringify(draft.tags), draft.sourceType, timestamp, deckId],
    );

    const existingCards = await database.getAllAsync<{ id: string }>("SELECT id FROM cards WHERE deck_id = ?;", [deckId]);
    const existingCardIds = new Set(existingCards.map((row) => row.id));
    const nextCardIds = new Set<string>();

    for (const [index, card] of draft.cards.entries()) {
      const cardId = card.id && existingCardIds.has(card.id) ? card.id : createId("card");

      nextCardIds.add(cardId);

      if (existingCardIds.has(cardId)) {
        await database.runAsync(
          `
            UPDATE cards
            SET term = ?, definition = ?, example = ?, sort_order = ?, updated_at = ?
            WHERE id = ? AND deck_id = ?;
          `,
          [card.term, card.definition, card.example || null, index, timestamp, cardId, deckId],
        );
      } else {
        await database.runAsync(
          `
            INSERT INTO cards (id, deck_id, term, definition, example, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
          `,
          [cardId, deckId, card.term, card.definition, card.example || null, index, timestamp, timestamp],
        );

        await ensureReviewStatForCard(deckId, cardId, timestamp);
      }
    }

    for (const existingCardId of existingCardIds) {
      if (!nextCardIds.has(existingCardId)) {
        await database.runAsync("DELETE FROM cards WHERE id = ? AND deck_id = ?;", [existingCardId, deckId]);
      }
    }
  });
}

export async function deleteDeck(deckId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM decks WHERE id = ?;", [deckId]);
}
