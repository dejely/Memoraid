import test from "node:test";
import assert from "node:assert/strict";
import { studyDay, summarizeProgress, topicMastery, type ReviewEvent } from "../src/features/progress/model";
function event(id: string, card: string, day = "2026-11-16", result: ReviewEvent["result"] = "correct"): ReviewEvent {
  return {
    id,
    card_id: card,
    deck_id: "deck",
    result,
    study_date: day,
    happened_at: day + "T10:00:00Z",
    timezone: "Asia/Manila",
    was_due: true,
    was_weak: true,
    grading_method: "automatic",
  };
}
test("daily cap, first-result XP, and each quest reward once", () => {
  const events = Array.from({ length: 10 }, (_, i) => event(`r${i}`, `c${i}`));
  const progress = summarizeProgress(
    [...events, ...events.map((e) => ({ ...e, id: e.id + "again", happened_at: e.study_date + "T11:00:00Z" }))],
    "2026-11-16",
  );
  assert.equal(progress.xp, 225);
  assert.equal(progress.level, 1);
  assert.equal(progress.streak, 1);
  assert.equal(
    summarizeProgress(
      [event("a", "c", undefined, "hard"), { ...event("b", "c"), happened_at: "2026-11-16T11:00:00Z" }],
      "2026-11-16",
    ).xp,
    10,
  );
});
test("streak counts yesterday until today qualifies, gaps break it", () => {
  const events = ["2026-11-14", "2026-11-15"].flatMap((day) =>
    Array.from({ length: 5 }, (_, i) => event(day + i, "c" + i, day)),
  );
  assert.equal(summarizeProgress(events, "2026-11-16").streak, 2);
  assert.equal(summarizeProgress(events, "2026-11-17").streak, 0);
  assert.equal(studyDay(new Date("2026-11-15T16:00:00Z"), "Asia/Manila"), "2026-11-16");
  assert.equal(studyDay(new Date("2026-11-15T15:59:59Z"), "Asia/Manila"), "2026-11-15");
});
test("mastery includes unreviewed cards and the latest daily result", () => {
  const events = [
    event("a", "c1", "2026-11-16", "hard"),
    { ...event("b", "c1"), happened_at: "2026-11-16T11:00:00Z", grading_method: "self_review" as const },
  ];
  assert.deepEqual(
    topicMastery(
      events,
      [
        { id: "c1", deck_id: "deck" },
        { id: "c2", deck_id: "deck" },
      ],
      [{ id: "deck", tags: ["stats"] }],
    ),
    [{ tag: "stats", percent: 50, selfReviewed: true }],
  );
});
