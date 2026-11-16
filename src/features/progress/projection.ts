import { studyDay, type ReviewEvent } from "./model";
type Daily = {
  first: Record<string, ReviewEvent>;
  due: string[];
  retry: string[];
  latest: Record<string, ReviewEvent>;
};
export type ProgressProjection = Record<string, Daily>;
const order = (a: ReviewEvent, b: ReviewEvent) =>
  Date.parse(a.happened_at) - Date.parse(b.happened_at) ||
  a.id.localeCompare(b.id);
export function projectEvent(
  projection: ProgressProjection,
  event: ReviewEvent,
) {
  const day = (projection[event.study_date] ??= {
    first: {},
    due: [],
    retry: [],
    latest: {},
  });
  const first = day.first[event.card_id],
    latest = day.latest[event.card_id];
  if (!first || order(event, first) < 0) day.first[event.card_id] = event;
  if (!latest || order(event, latest) > 0) day.latest[event.card_id] = event;
  if (event.was_due && !day.due.includes(event.card_id))
    day.due.push(event.card_id);
  if (
    event.was_weak &&
    ["correct", "easy"].includes(event.result) &&
    !day.retry.includes(event.card_id)
  )
    day.retry.push(event.card_id);
  return projection;
}
export function rebuildProjection(events: ReviewEvent[]) {
  return events.reduce(projectEvent, {} as ProgressProjection);
}
export function readProjection(
  projection: ProgressProjection,
  today = studyDay(),
) {
  let xp = 0;
  for (const day of Object.values(projection)) {
    xp += Object.values(day.first).reduce(
      (total, e) =>
        total + 10 + (["correct", "easy"].includes(e.result) ? 5 : 0),
      0,
    );
    xp +=
      (Number(Object.keys(day.first).length >= 10) +
        Number(day.due.length >= 5) +
        Number(day.retry.length >= 3)) *
      25;
  }
  const current = projection[today];
  const count = (day: string) =>
    Object.keys(projection[day]?.first ?? {}).length;
  const prev = (day: string) =>
    new Date(Date.parse(day + "T12:00:00Z") - 86400000)
      .toISOString()
      .slice(0, 10);
  let streak = 0,
    day = count(today) >= 5 ? today : prev(today);
  while (count(day) >= 5) {
    streak++;
    day = prev(day);
  }
  return {
    xp,
    level: 1 + Math.floor(xp / 250),
    streak,
    reviewedToday: count(today),
    quests: [
      { label: "Review 10 distinct cards", current: count(today), target: 10 },
      {
        label: "Review 5 due cards",
        current: current?.due.length ?? 0,
        target: 5,
      },
      {
        label: "Correctly retry 3 weak cards",
        current: current?.retry.length ?? 0,
        target: 3,
      },
    ],
  };
}
