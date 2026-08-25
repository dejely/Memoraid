import type { Deck, DeckDraft, DeckSummary, ReviewStats, SourceType } from "../../types/models";
import { nowIso } from "../../utils/date";
import { createId } from "../../utils/ids";
import { cloudDatabase, jsonStringArray, throwIfCloudError } from "./supabase-helpers.web";

type DeckRow = {
  id: string;
  title: string;
  description: string;
  tags_json: unknown;
  source_type: SourceType;
  created_at: string;
  updated_at: string;
  last_studied_at: string | null;
};

type CardRow = {
  id: string;
  deck_id: string;
  term: string;
  definition: string;
  example: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ReviewRow = {
  card_id: string;
  deck_id: string;
  ease_score: number;
  easy_count: number;
  hard_count: number;
  last_reviewed_at: string | null;
  due_at: string | null;
  last_result: ReviewStats["lastResult"];
};

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

function mapSummary(row: DeckRow, cardCount: number, dueCount: number): DeckSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: jsonStringArray(row.tags_json),
    cardCount,
    dueCount,
    updatedAt: row.updated_at,
    lastStudiedAt: row.last_studied_at,
    sourceType: row.source_type,
  };
}

export async function getDeckSummaries(): Promise<DeckSummary[]> {
  const client = cloudDatabase();
  const [decksResult, cardsResult, reviewsResult] = await Promise.all([
    client
      .from("decks")
      .select("id,title,description,tags_json,source_type,created_at,updated_at,last_studied_at")
      .order("updated_at", { ascending: false }),
    client.from("cards").select("id,deck_id"),
    client.from("review_stats").select("deck_id,due_at").lte("due_at", nowIso()),
  ]);

  throwIfCloudError(decksResult.error, "Study sets could not be loaded");
  throwIfCloudError(cardsResult.error, "Study-card totals could not be loaded");
  throwIfCloudError(reviewsResult.error, "Review totals could not be loaded");

  const cardCounts = new Map<string, number>();
  const dueCounts = new Map<string, number>();

  for (const card of cardsResult.data ?? []) {
    cardCounts.set(card.deck_id, (cardCounts.get(card.deck_id) ?? 0) + 1);
  }

  for (const review of reviewsResult.data ?? []) {
    dueCounts.set(review.deck_id, (dueCounts.get(review.deck_id) ?? 0) + 1);
  }

  return ((decksResult.data ?? []) as DeckRow[]).map((row) =>
    mapSummary(row, cardCounts.get(row.id) ?? 0, dueCounts.get(row.id) ?? 0),
  );
}

export async function getDeckById(deckId: string): Promise<Deck | null> {
  const client = cloudDatabase();
  const [deckResult, cardsResult, reviewsResult] = await Promise.all([
    client
      .from("decks")
      .select("id,title,description,tags_json,source_type,created_at,updated_at,last_studied_at")
      .eq("id", deckId)
      .maybeSingle(),
    client
      .from("cards")
      .select("id,deck_id,term,definition,example,sort_order,created_at,updated_at")
      .eq("deck_id", deckId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    client
      .from("review_stats")
      .select("card_id,deck_id,ease_score,easy_count,hard_count,last_reviewed_at,due_at,last_result")
      .eq("deck_id", deckId),
  ]);

  throwIfCloudError(deckResult.error, "The study set could not be loaded");
  throwIfCloudError(cardsResult.error, "The study cards could not be loaded");
  throwIfCloudError(reviewsResult.error, "The review history could not be loaded");

  if (!deckResult.data) {
    return null;
  }

  const rows = (cardsResult.data ?? []) as CardRow[];
  const reviewByCard = new Map((reviewsResult.data ?? []).map((row) => [row.card_id, row as ReviewRow]));
  const dueCount = Array.from(reviewByCard.values()).filter(
    (review) => review.due_at && Date.parse(review.due_at) <= Date.now(),
  ).length;

  return {
    ...mapSummary(deckResult.data as DeckRow, rows.length, dueCount),
    cards: rows.map((row) => {
      const review = reviewByCard.get(row.id);

      return {
        id: row.id,
        deckId: row.deck_id,
        term: row.term,
        definition: row.definition,
        example: row.example,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        reviewStats: review
          ? {
              cardId: review.card_id,
              deckId: review.deck_id,
              easeScore: review.ease_score,
              easyCount: review.easy_count,
              hardCount: review.hard_count,
              lastReviewedAt: review.last_reviewed_at,
              dueAt: review.due_at,
              lastResult: review.last_result,
            }
          : null,
      };
    }),
  };
}

export async function createDeck(input: DeckDraft): Promise<string> {
  const client = cloudDatabase();
  const draft = normalizeDraft(input);
  const timestamp = nowIso();
  const deckId = createId("deck");
  const cardRows = draft.cards.map((card, index) => ({
    id: createId("card"),
    deck_id: deckId,
    term: card.term,
    definition: card.definition,
    example: card.example || null,
    sort_order: index,
    created_at: timestamp,
    updated_at: timestamp,
  }));

  const deckResult = await client.from("decks").insert({
    id: deckId,
    title: draft.title,
    description: draft.description,
    tags_json: draft.tags,
    source_type: draft.sourceType,
    created_at: timestamp,
    updated_at: timestamp,
    last_studied_at: null,
  });
  throwIfCloudError(deckResult.error, "The study set could not be created");

  try {
    if (cardRows.length > 0) {
      const cardsResult = await client.from("cards").insert(cardRows);
      throwIfCloudError(cardsResult.error, "The study cards could not be created");

      const reviewsResult = await client.from("review_stats").insert(
        cardRows.map((card) => ({
          card_id: card.id,
          deck_id: deckId,
          ease_score: 2.5,
          easy_count: 0,
          hard_count: 0,
          last_reviewed_at: null,
          due_at: timestamp,
          last_result: null,
        })),
      );
      throwIfCloudError(reviewsResult.error, "Review scheduling could not be initialized");
    }
  } catch (error) {
    await client.from("decks").delete().eq("id", deckId);
    throw error;
  }

  return deckId;
}

export async function updateDeck(deckId: string, input: DeckDraft): Promise<void> {
  const client = cloudDatabase();
  const draft = normalizeDraft(input);
  const timestamp = nowIso();
  const existingResult = await client.from("cards").select("id").eq("deck_id", deckId);
  throwIfCloudError(existingResult.error, "Existing study cards could not be loaded");

  const existingIds = new Set((existingResult.data ?? []).map((row) => row.id));
  const retainedIds = new Set<string>();
  const insertRows = [];

  const deckResult = await client
    .from("decks")
    .update({
      title: draft.title,
      description: draft.description,
      tags_json: draft.tags,
      source_type: draft.sourceType,
    })
    .eq("id", deckId);
  throwIfCloudError(deckResult.error, "The study set could not be updated");

  for (const [index, card] of draft.cards.entries()) {
    const cardId = card.id && existingIds.has(card.id) ? card.id : createId("card");
    retainedIds.add(cardId);

    if (existingIds.has(cardId)) {
      const updateResult = await client
        .from("cards")
        .update({
          term: card.term,
          definition: card.definition,
          example: card.example || null,
          sort_order: index,
        })
        .eq("id", cardId)
        .eq("deck_id", deckId);
      throwIfCloudError(updateResult.error, "A study card could not be updated");
    } else {
      insertRows.push({
        id: cardId,
        deck_id: deckId,
        term: card.term,
        definition: card.definition,
        example: card.example || null,
        sort_order: index,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
  }

  if (insertRows.length > 0) {
    const insertResult = await client.from("cards").insert(insertRows);
    throwIfCloudError(insertResult.error, "New study cards could not be added");

    try {
      const reviewsResult = await client.from("review_stats").insert(
        insertRows.map((card) => ({
          card_id: card.id,
          deck_id: deckId,
          ease_score: 2.5,
          easy_count: 0,
          hard_count: 0,
          last_reviewed_at: null,
          due_at: timestamp,
          last_result: null,
        })),
      );
      throwIfCloudError(reviewsResult.error, "Review scheduling could not be initialized");
    } catch (error) {
      await client.from("cards").delete().eq("deck_id", deckId).in(
        "id",
        insertRows.map((card) => card.id),
      );
      throw error;
    }
  }

  const staleIds = Array.from(existingIds).filter((id) => !retainedIds.has(id));

  if (staleIds.length > 0) {
    const deleteResult = await client.from("cards").delete().eq("deck_id", deckId).in("id", staleIds);
    throwIfCloudError(deleteResult.error, "Removed study cards could not be deleted");
  }
}

export async function deleteDeck(deckId: string): Promise<void> {
  const result = await cloudDatabase().from("decks").delete().eq("id", deckId);
  throwIfCloudError(result.error, "The study set could not be deleted");
}
