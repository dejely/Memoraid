import { getDatabase } from "../client";
import { studyStore, studyChanged } from "./store";
import { importLegacy, type LegacyRows } from "./legacy";
export async function legacyDeviceCount() {
  const db = await getDatabase();
  return (
    (
      await db.getFirstAsync<{ count: number }>(
        "SELECT count(*) AS count FROM decks",
      )
    )?.count ?? 0
  );
}
export async function adoptDeviceLibrary() {
  const store = studyStore(),
    db = await getDatabase();
  const rows: LegacyRows = {};
  for (const table of [
    "decks",
    "cards",
    "review_stats",
    "sessions",
    "test_attempts",
    "test_questions",
    "review_events",
  ])
    rows[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  await store.transaction(async (tx) => {
    if (await tx.get("meta", "deviceAdopted")) return;
    await importLegacy(tx, rows);
    await tx.set("meta", "deviceAdopted", true);
  });
  studyChanged();
}
