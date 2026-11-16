import test from "node:test";
import assert from "node:assert/strict";
import {
  concepts,
  statisticsProblem,
  weakConcept,
} from "../src/features/practice/statistics";
import {
  initializeSchedule,
  replaySchedule,
} from "../src/features/progress/schedule";
import {
  rebuildProjection,
  readProjection,
  projectEvent,
} from "../src/features/progress/projection";
import {
  summarizeProgress,
  type ReviewEvent,
} from "../src/features/progress/model";
const event = (
  id: string,
  result: ReviewEvent["result"] = "correct",
): ReviewEvent => ({
  id,
  card_id: "c" + id,
  deck_id: "d",
  result,
  happened_at: `2026-11-17T10:00:${id.padStart(2, "0")}Z`,
  study_date: "2026-11-17",
  timezone: "UTC",
  was_due: true,
  was_weak: true,
  grading_method: "automatic",
});
test("core statistics reproduce every template and independent known mean/variance values", () => {
  for (const c of concepts) {
    const a = statisticsProblem(c, 42);
    assert.deepEqual(a, statisticsProblem(c, 42));
    assert.ok(Number.isFinite(Number(a.expected)));
  }
  const mean = statisticsProblem("mean", 42),
    sample = statisticsProblem("sample_variance", 42),
    population = statisticsProblem("population_variance", 42);
  const values = mean.prompt
    .split("of: ")[1]
    .slice(0, -1)
    .split(", ")
    .map(Number);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  assert.equal(Number(mean.expected), avg);
  assert.equal(
    Number(sample.expected) / Number(population.expected),
    values.length / (values.length - 1),
  );
  assert.equal(
    weakConcept([
      { concept: "sample_sd", isCorrect: false, createdAt: "2026-11-17" },
    ]),
    "sample_sd",
  );
});
test("FSRS initialization preserves due date without invented reviews; replay ignores duplicates and input order", () => {
  const baseline = {
    cardId: "c",
    deckId: "d",
    easeScore: 2.5,
    easyCount: 4,
    hardCount: 2,
    lastReviewedAt: "2026-11-01T00:00:00Z",
    dueAt: "2026-11-30T00:00:00Z",
    lastResult: "easy" as const,
  };
  const initial = initializeSchedule(baseline, "2026-11-17T00:00:00Z");
  assert.equal(
    new Date(initial.due).toISOString(),
    new Date(baseline.dueAt).toISOString(),
  );
  assert.equal(initial.reps, 0);
  const a = { ...event("1", "incorrect"), card_id: "c" },
    b = { ...event("2", "correct"), card_id: "c" };
  assert.deepEqual(
    replaySchedule(baseline, [b, a, a]),
    replaySchedule(baseline, [a, b]),
  );
  assert.equal(replaySchedule(baseline, [a, b])?.fsrs?.reps, 2);
});
test("incremental progress equals full rebuild and existing reward rules with out-of-order events", () => {
  const events = Array.from({ length: 12 }, (_, i) =>
    event(String(i), i % 3 ? "correct" : "incorrect"),
  );
  const incremental = events.toReversed().reduce(projectEvent, {});
  assert.deepEqual(
    readProjection(incremental, "2026-11-17"),
    summarizeProgress(events, "2026-11-17"),
  );
  assert.deepEqual(
    readProjection(incremental, "2026-11-17"),
    readProjection(rebuildProjection([...events, ...events]), "2026-11-17"),
  );
});
