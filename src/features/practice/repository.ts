import { saveInk, readInk } from "./ink-storage";
import { studyStore, studyChanged } from "../../db/local/store";
import { entities, writeEntity } from "../../db/local/operations";
import { entityKey, type Entity } from "../../db/local/types";
import { addReview } from "../../db/local/library";
import type { Ink } from "./ink";
import type { PracticeProblem } from "./statistics";
import type { GradingMethod } from "../../services/math/grading";
import { createId } from "../../utils/ids";
export interface PracticeDraft {
  id: string;
  problem: PracticeProblem;
  answer: string;
  originalRecognition?: string;
  confirmedRecognition?: string;
  ink?: Ink;
}
export interface PracticeAttempt extends Omit<PracticeDraft, "ink"> {
  inkId?: string;
  isCorrect: boolean;
  method: GradingMethod;
  createdAt: string;
  correction?: string;
  diagnosis: "self_review";
}
export function loadPracticeDraft(store = studyStore()) {
  return store.transaction(async (tx) => {
    const draft = await tx.get<PracticeDraft>("meta", "practiceDraft");
    if (!draft) return undefined;
    return { ...draft, ink: await readInk(tx, draft.id) };
  });
}
export function savePracticeDraft(draft: PracticeDraft, store = studyStore()) {
  return store.transaction(async (tx) => {
    const { ink, ...metadata } = draft;
    await tx.set("meta", "practiceDraft", metadata);
    if (ink) await saveInk(tx, draft.id, ink);
  });
}
export async function finishPractice(
  draft: PracticeDraft,
  isCorrect: boolean,
  method: GradingMethod,
  store = studyStore(),
) {
  await store.transaction(async (tx) => {
    if (await tx.get("entities", entityKey("attempt", draft.id))) return;
    const { ink, ...metadata } = draft;
    const attempt: PracticeAttempt = {
      ...metadata,
      inkId: ink?.strokes.length ? draft.id : undefined,
      isCorrect,
      method,
      createdAt: new Date().toISOString(),
      diagnosis: "self_review",
    };
    if (ink) await saveInk(tx, draft.id, ink);
    await writeEntity(tx, "attempt", draft.id, attempt);
    await addReview(
      tx,
      draft.problem.cardId,
      draft.problem.deckId,
      isCorrect ? "correct" : "incorrect",
      `practice:${draft.id}`,
      method,
    );
    const saved = await tx.get<PracticeDraft>("meta", "practiceDraft");
    if (saved?.id === draft.id) await tx.remove("meta", "practiceDraft");
  });
  studyChanged();
}
export function practiceAttempts() {
  return studyStore().transaction(async (tx) =>
    (await entities<PracticeAttempt>(tx, "attempt"))
      .map((e) => e.payload)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
export function loadInk(id: string) {
  return studyStore().transaction((tx) => readInk(tx, id));
}
export async function correctAttempt(
  attempt: PracticeAttempt,
  correction: string,
) {
  await studyStore().transaction((tx) =>
    writeEntity(tx, "attempt", attempt.id, {
      ...attempt,
      correction: correction.trim(),
    }),
  );
  studyChanged();
}
export function newPracticeDraft(problem: PracticeProblem): PracticeDraft {
  return { id: createId("practice"), problem, answer: "" };
}
