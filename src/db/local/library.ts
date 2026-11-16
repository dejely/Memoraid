import type {
  Deck,
  DeckDraft,
  DeckSummary,
  ReviewStats,
  ReviewResult,
  FlashcardSession,
  RuntimeTestAnswer,
  RuntimeTestQuestion,
  TestAttemptSummary,
  TestQuestionRecord,
  ActivityItem,
  DueCard,
} from "../../types/models";
import type { GradingMethod } from "../../services/math/grading";
import { stripMath } from "../../services/math/grading";
import { createId } from "../../utils/ids";
import { studyStore, studyChanged } from "./store";
import { entities, writeEntity } from "./operations";
import { entityKey, type LocalTransaction, type Entity } from "./types";
import { replaySchedule } from "../../features/progress/schedule";
import {
  studyDay,
  topicMastery,
  type ReviewEvent,
} from "../../features/progress/model";
import {
  projectEvent,
  readProjection,
  rebuildProjection,
  type ProgressProjection,
} from "../../features/progress/projection";
const now = () => new Date().toISOString();
function hydrateDeck(row: Entity<Deck>, all: Entity[]): Deck {
  const deck: Deck = JSON.parse(JSON.stringify(row.payload));
  const byCard = new Map<string, ReviewEvent[]>();
  for (const record of all)
    if (record.kind === "review" && !record.deleted) {
      const event = record.payload as ReviewEvent;
      const group = byCard.get(event.card_id) ?? [];
      group.push(event);
      byCard.set(event.card_id, group);
    }
  const baselines = new Map(
    all
      .filter((r) => r.kind === "baseline" && !r.deleted)
      .map((r) => [r.id, r.payload as ReviewStats]),
  );
  for (const card of deck.cards)
    card.reviewStats = replaySchedule(
      baselines.get(card.id) ?? card.reviewStats ?? null,
      byCard.get(card.id) ?? [],
    );
  deck.cardCount = deck.cards.length;
  deck.dueCount = deck.cards.filter(
    (c) =>
      c.reviewStats?.dueAt && Date.parse(c.reviewStats.dueAt) <= Date.now(),
  ).length;
  return deck;
}
async function deckIn(tx: LocalTransaction, id: string): Promise<Deck | null> {
  const all = await tx.all<Entity>("entities");
  const row = all.find((r) => r.kind === "deck" && r.id === id && !r.deleted);
  return row ? hydrateDeck(row, all) : null;
}
async function allDecks(tx: LocalTransaction): Promise<Deck[]> {
  const all = await tx.all<Entity>("entities");
  return all
    .filter((r) => r.kind === "deck" && !r.deleted)
    .map((row) => hydrateDeck(row, all))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function getDeckById(id: string) {
  return studyStore().transaction((tx) => deckIn(tx, id));
}
export function getDeckSummaries(): Promise<DeckSummary[]> {
  return studyStore().transaction(allDecks);
}
export async function createDeck(input: DeckDraft) {
  const id = createId("deck");
  await updateDeck(id, input);
  return id;
}
export async function updateDeck(id: string, input: DeckDraft) {
  await studyStore().transaction(async (tx) => {
    const previous = (
      await tx.get<Entity<Deck>>("entities", entityKey("deck", id))
    )?.payload;
    const timestamp = now();
    const cards = input.cards
      .filter((c) => stripMath(c.term) && stripMath(c.definition))
      .map((card, index) => {
        const old = previous?.cards.find((c) => c.id === card.id);
        return {
          id: old?.id ?? createId("card"),
          deckId: id,
          term: card.term.trim(),
          definition: card.definition.trim(),
          example: card.example?.trim() || null,
          gradingMode: card.gradingMode ?? ("self_review" as const),
          numericTolerance: card.numericTolerance ?? 0.001,
          sortOrder: index,
          createdAt: old?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
      });
    await writeEntity(tx, "deck", id, {
      id,
      title: input.title.trim(),
      description: input.description.trim(),
      tags: input.tags.map((t) => t.trim()).filter(Boolean),
      sourceType: input.sourceType ?? previous?.sourceType ?? "manual",
      updatedAt: timestamp,
      lastStudiedAt: previous?.lastStudiedAt ?? null,
      cards,
      cardCount: cards.length,
      dueCount: cards.length,
    });
    for (const card of cards)
      if (!(await tx.get("entities", entityKey("baseline", card.id))))
        await writeEntity(tx, "baseline", card.id, {
          cardId: card.id,
          deckId: id,
          easeScore: 2.5,
          easyCount: 0,
          hardCount: 0,
          lastReviewedAt: null,
          dueAt: timestamp,
          lastResult: null,
        });
  });
  studyChanged();
}
export async function deleteDeck(id: string) {
  await studyStore().transaction((tx) =>
    writeEntity(tx, "deck", id, null, true),
  );
  studyChanged();
}
export async function getReviewStats(cardId: string) {
  return studyStore().transaction(async (tx) => {
    const all = await tx.all<Entity>("entities");
    const baseline =
      all.find((e) => e.kind === "baseline" && e.id === cardId && !e.deleted)
        ?.payload ?? null;
    const events = all
      .filter(
        (e) =>
          e.kind === "review" && !e.deleted && e.payload.card_id === cardId,
      )
      .map((e) => e.payload as ReviewEvent);
    return replaySchedule(baseline, events);
  });
}
export async function addReview(
  tx: LocalTransaction,
  cardId: string,
  deckId: string,
  result: ReviewResult,
  id: string,
  method: GradingMethod,
) {
  if (await tx.get("entities", entityKey("review", id))) return;
  const deck = await deckIn(tx, deckId);
  const baseline =
    (
      await tx.get<Entity<ReviewStats>>(
        "entities",
        entityKey("baseline", cardId),
      )
    )?.payload ?? null;
  const existing =
    deck?.cards.find((c) => c.id === cardId)?.reviewStats ??
    replaySchedule(
      baseline,
      (await entities<ReviewEvent>(tx, "review"))
        .map((e) => e.payload)
        .filter((e) => e.card_id === cardId),
    );
  const timestamp = now(),
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const event: ReviewEvent = {
    id,
    card_id: cardId,
    deck_id: deckId,
    result,
    happened_at: timestamp,
    study_date: studyDay(new Date(timestamp), timezone),
    timezone,
    was_due: !!existing?.dueAt && existing.dueAt <= timestamp,
    was_weak: ["hard", "incorrect"].includes(existing?.lastResult ?? ""),
    grading_method: method,
  };
  await writeEntity(tx, "review", id, event);
  const projection =
    (await tx.get<ProgressProjection>("meta", "progress")) ?? {};
  await tx.set("meta", "progress", projectEvent(projection, event));
}
export async function recordReview(
  cardId: string,
  deckId: string,
  result: ReviewResult,
  id = createId("review"),
  method: GradingMethod = "self_review",
) {
  await studyStore().transaction((tx) =>
    addReview(tx, cardId, deckId, result, id, method),
  );
  studyChanged();
}
export function getFlashcardSession(
  deckId: string,
): Promise<FlashcardSession | null> {
  return studyStore().transaction(
    async (tx) =>
      (await entities<FlashcardSession>(tx, "session")).find(
        (e) => e.payload.deckId === deckId,
      )?.payload ?? null,
  );
}
export async function saveFlashcardSession(input: {
  deckId: string;
  currentIndex: number;
  order: string[];
  shuffleEnabled: boolean;
  easyCount: number;
  hardCount: number;
  completedAt?: string | null;
  sessionId?: string | null;
  startedAt?: string | null;
}): Promise<FlashcardSession> {
  return studyStore().transaction(async (tx) => {
    const previous = (await entities<FlashcardSession>(tx, "session")).find(
      (e) => e.id === input.deckId,
    )?.payload;
    const session: FlashcardSession = {
      ...input,
      id: input.sessionId ?? previous?.id ?? createId("session"),
      mode: "flashcard",
      startedAt: input.startedAt ?? previous?.startedAt ?? now(),
      updatedAt: now(),
      completedAt: input.completedAt ?? null,
    };
    await writeEntity(tx, "session", input.deckId, session);
    return session;
  });
}
type StoredTest = {
  summary: TestAttemptSummary;
  questions: TestQuestionRecord[];
};
export async function saveTestAttempt(input: {
  deck: Pick<DeckSummary, "id" | "title">;
  questions: RuntimeTestQuestion[];
  answers: RuntimeTestAnswer[];
  startedAt: string;
  finishedAt: string;
}) {
  const id = `attempt:${input.startedAt}`;
  await studyStore().transaction(async (tx) => {
    const correct = input.answers.filter((a) => a.isCorrect).length;
    const objective = input.answers.filter((a) => a.questionType !== "written");
    const summary: TestAttemptSummary = {
      id,
      deckId: input.deck.id,
      deckTitle: input.deck.title,
      totalQuestions: input.questions.length,
      correctAnswers: correct,
      objectiveCorrect: objective.filter((a) => a.isCorrect).length,
      objectiveTotal: objective.length,
      writtenCount: input.answers.length - objective.length,
      scorePercent: input.questions.length
        ? Math.round((correct / input.questions.length) * 100)
        : 0,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      weakCardCount: new Set(
        input.answers.filter((a) => a.isCorrect === false).map((a) => a.cardId),
      ).size,
    };
    const questions: TestQuestionRecord[] = input.questions.map((q) => {
      const a = input.answers.find((a) => a.questionId === q.id);
      return {
        ...q,
        attemptId: id,
        selectedAnswer: a?.selectedAnswer ?? null,
        gradingMethod: a?.gradingMethod ?? "self_review",
        options: q.options ?? null,
        isCorrect: a?.isCorrect ?? null,
        createdAt: input.finishedAt,
      };
    });
    await writeEntity(tx, "test", id, { summary, questions });
  });
  studyChanged();
  return id;
}
export function getRecentTestAttempts(limit = 20) {
  return studyStore().transaction(async (tx) =>
    (await entities<StoredTest>(tx, "test"))
      .map((e) => e.payload.summary)
      .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
      .slice(0, limit),
  );
}
export function getAttemptQuestions(id: string) {
  return studyStore().transaction(
    async (tx) =>
      (await tx.get<Entity<StoredTest>>("entities", entityKey("test", id)))
        ?.payload.questions ?? [],
  );
}
export async function getDueCards(limit = 10): Promise<DueCard[]> {
  return studyStore().transaction(async (tx) =>
    (await allDecks(tx))
      .flatMap((d) =>
        d.cards
          .filter((c) => c.reviewStats?.dueAt && c.reviewStats.dueAt <= now())
          .map((c) => ({
            cardId: c.id,
            deckId: d.id,
            deckTitle: d.title,
            term: c.term,
            dueAt: c.reviewStats!.dueAt,
          })),
      )
      .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
      .slice(0, limit),
  );
}
export async function getRecentStudyActivity(
  limit = 10,
): Promise<ActivityItem[]> {
  return studyStore().transaction(async (tx) => {
    const decks = await entities<Deck>(tx, "deck");
    const sessions = await entities<FlashcardSession>(tx, "session");
    const tests = await entities<StoredTest>(tx, "test");
    return [
      ...sessions.map(({ payload: s }): ActivityItem => ({
        id: s.id,
        type: "study",
        title:
          decks.find((d) => d.id === s.deckId)?.payload.title ?? "Study set",
        subtitle: s.completedAt
          ? "Completed a flashcard run"
          : `Resumed at card ${s.currentIndex + 1}`,
        happenedAt: s.updatedAt,
      })),
      ...tests.map(({ payload: { summary: s } }): ActivityItem => ({
        id: s.id,
        type: "test",
        title: s.deckTitle,
        subtitle: `Scored ${s.scorePercent}% on ${s.totalQuestions} questions`,
        happenedAt: s.finishedAt,
      })),
    ]
      .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt))
      .slice(0, limit);
  });
}
export async function getDashboardData() {
  const [decks, recentActivity, dueCards, testHistory] = await Promise.all([
    getDeckSummaries(),
    getRecentStudyActivity(8),
    getDueCards(6),
    getRecentTestAttempts(6),
  ]);
  return { decks, recentActivity, dueCards, testHistory };
}
export async function getStudyProgress() {
  return studyStore().transaction(async (tx) => {
    let projection = await tx.get<ProgressProjection>("meta", "progress");
    if (!projection) {
      projection = rebuildProjection(
        (await entities<ReviewEvent>(tx, "review")).map((e) => e.payload),
      );
      await tx.set("meta", "progress", projection);
    }
    const decks = (await entities<Deck>(tx, "deck")).map((e) => e.payload);
    const latest = Object.values(projection).flatMap((d) =>
      Object.values(d.latest),
    );
    return {
      ...readProjection(projection),
      topics: topicMastery(
        latest,
        decks.flatMap((d) => d.cards.map((c) => ({ id: c.id, deck_id: d.id }))),
        decks,
      ),
    };
  });
}
export async function rebuildStudyProgress() {
  await studyStore().transaction((tx) => tx.remove("meta", "progress"));
  studyChanged();
}
