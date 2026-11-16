import type { Deck, ReviewStats } from "../../types/models";
import type { LocalTransaction } from "./types";
import { entityKey } from "./types";
import { writeEntity } from "./operations";
import { mapAttemptRow, mapSessionRow, mapTestQuestionRow } from "../mappers";
export type LegacyRows = Record<string, any[]>;
const array = (value: unknown): string[] => {
  try {
    const a = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};
export async function importLegacy(tx: LocalTransaction, rows: LegacyRows) {
  for (const d of rows.decks ?? []) {
    if (await tx.get("entities", entityKey("deck", d.id))) continue;
    const cards = (rows.cards ?? [])
      .filter((c) => c.deck_id === d.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        id: c.id,
        deckId: d.id,
        term: c.term,
        definition: c.definition,
        example: c.example,
        gradingMode: c.grading_mode ?? "self_review",
        numericTolerance: c.numeric_tolerance ?? 0.001,
        sortOrder: c.sort_order,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
    const deck: Deck = {
      id: d.id,
      title: d.title,
      description: d.description,
      tags: array(d.tags_json),
      sourceType: d.source_type,
      updatedAt: d.updated_at,
      lastStudiedAt: d.last_studied_at,
      cardCount: cards.length,
      dueCount: 0,
      cards,
    };
    await writeEntity(tx, "deck", d.id, deck);
    for (const c of cards) {
      const r = (rows.review_stats ?? []).find((r) => r.card_id === c.id);
      const baseline: ReviewStats = {
        cardId: c.id,
        deckId: d.id,
        easeScore: r?.ease_score ?? 2.5,
        easyCount: r?.easy_count ?? 0,
        hardCount: r?.hard_count ?? 0,
        lastReviewedAt: r?.last_reviewed_at ?? null,
        dueAt: r?.due_at ?? c.createdAt,
        lastResult: r?.last_result ?? null,
      };
      await writeEntity(tx, "baseline", c.id, baseline);
    }
  }
  for (const r of rows.review_events ?? [])
    if (!(await tx.get("entities", entityKey("review", r.id)))) {
      const { user_id, ...event } = r;
      await writeEntity(tx, "review", r.id, event);
    }
  for (const s of rows.sessions ?? [])
    if (!(await tx.get("entities", entityKey("session", s.deck_id))))
      await writeEntity(
        tx,
        "session",
        s.deck_id,
        mapSessionRow({
          ...s,
          order_json: JSON.stringify(array(s.order_json)),
          shuffle_enabled: Number(s.shuffle_enabled),
        }),
      );
  for (const a of rows.test_attempts ?? [])
    if (!(await tx.get("entities", entityKey("test", a.id)))) {
      const questions = (rows.test_questions ?? [])
        .filter((q) => q.attempt_id === a.id)
        .map((q) =>
          mapTestQuestionRow({
            ...q,
            options_json: q.options_json
              ? JSON.stringify(array(q.options_json))
              : null,
            is_correct: q.is_correct === null ? null : Number(q.is_correct),
          }),
        );
      await writeEntity(tx, "test", a.id, {
        summary: mapAttemptRow(a),
        questions,
      });
    }
  await tx.remove("meta", "progress");
}
