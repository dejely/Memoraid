import type { ReviewResult } from "../../types/models";
export interface ReviewEvent {
  id: string;
  card_id: string;
  deck_id: string;
  result: ReviewResult;
  happened_at: string;
  study_date: string;
  timezone: string;
  was_due: boolean | number;
  was_weak: boolean | number;
  grading_method: "automatic" | "self_review";
}
export function studyDay(date = new Date(), timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"].map((name) => parts.find((part) => part.type === name)!.value).join("-");
}
function previousDay(day: string) {
  return new Date(Date.parse(`${day}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
}
export function summarizeProgress(events: ReviewEvent[], today = studyDay()) {
  const sorted = [...events].sort((a, b) => a.happened_at.localeCompare(b.happened_at) || a.id.localeCompare(b.id));
  const days = new Map<string, { cards: Set<string>; due: Set<string>; retry: Set<string> }>();
  const dailyCards = new Set<string>();
  let xp = 0;
  for (const event of sorted) {
    const key = `${event.study_date}:${event.card_id}`;
    const correct = event.result === "correct" || event.result === "easy";
    if (!dailyCards.has(key)) {
      xp += 10 + (correct ? 5 : 0);
      dailyCards.add(key);
    }
    const day = days.get(event.study_date) ?? {
      cards: new Set<string>(),
      due: new Set<string>(),
      retry: new Set<string>(),
    };
    day.cards.add(event.card_id);
    if (event.was_due) day.due.add(event.card_id);
    if (event.was_weak && correct) day.retry.add(event.card_id);
    days.set(event.study_date, day);
  }
  for (const day of days.values())
    xp += (Number(day.cards.size >= 10) + Number(day.due.size >= 5) + Number(day.retry.size >= 3)) * 25;
  const daily = days.get(today);
  const quests = [
    { label: "Review 10 distinct cards", current: daily?.cards.size ?? 0, target: 10 },
    { label: "Review 5 due cards", current: daily?.due.size ?? 0, target: 5 },
    { label: "Correctly retry 3 weak cards", current: daily?.retry.size ?? 0, target: 3 },
  ];
  let streak = 0,
    day = (days.get(today)?.cards.size ?? 0) >= 5 ? today : previousDay(today);
  while ((days.get(day)?.cards.size ?? 0) >= 5) {
    streak++;
    day = previousDay(day);
  }
  return { xp, level: 1 + Math.floor(xp / 250), streak, quests, reviewedToday: daily?.cards.size ?? 0 };
}
export function topicMastery(
  events: ReviewEvent[],
  cards: { id: string; deck_id: string }[],
  decks: { id: string; tags: string[] }[],
) {
  const latestDaily = new Map<string, ReviewEvent>();
  for (const event of [...events].sort(
    (a, b) => a.happened_at.localeCompare(b.happened_at) || a.id.localeCompare(b.id),
  ))
    latestDaily.set(`${event.card_id}:${event.study_date}`, event);
  const byCard = new Map<string, ReviewEvent[]>();
  for (const event of latestDaily.values()) byCard.set(event.card_id, [...(byCard.get(event.card_id) ?? []), event]);
  const topics = new Map<string, { score: number; count: number; selfReviewed: boolean }>();
  for (const card of cards) {
    const recent = (byCard.get(card.id) ?? []).sort((a, b) => b.happened_at.localeCompare(a.happened_at)).slice(0, 3);
    const score = recent.length
      ? recent.filter((e) => e.result === "correct" || e.result === "easy").length / recent.length
      : 0;
    for (const tag of new Set(decks.find((d) => d.id === card.deck_id)?.tags ?? [])) {
      const topic = topics.get(tag) ?? { score: 0, count: 0, selfReviewed: false };
      topic.score += score;
      topic.count++;
      topic.selfReviewed ||= recent.some((e) => e.grading_method === "self_review");
      topics.set(tag, topic);
    }
  }
  return [...topics].map(([tag, value]) => ({
    tag,
    percent: Math.round((value.score / value.count) * 100),
    selfReviewed: value.selfReviewed,
  }));
}
