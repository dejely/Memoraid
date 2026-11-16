import { getSupabaseClient } from "../auth/supabase-client";
import { studyStore, studyChanged } from "../../db/local/store";
import { importLegacy, type LegacyRows } from "../../db/local/legacy";
import { synchronize } from "./engine";
import { writeEntity } from "../../db/local/operations";
import { entityKey } from "../../db/local/types";
const jobs = new Map<string, Promise<void>>();
async function runSync() {
  const store = studyStore(),
    client = getSupabaseClient();
  const account = store.account;
  const rpc = async (name: string, args: object) => {
    if (studyStore().account !== account) throw new Error("Account changed.");
    const result = await client.rpc(name, { p_account: account, ...args });
    if (result.error)
      throw new Error(
        result.error.code === "PGRST202"
          ? "Apply the 20261117000000 adaptive learning migration in Supabase before syncing. Your local library is available."
          : "Sync could not finish. Reconnect and retry; local changes are saved.",
      );
    return result.data;
  };
  await synchronize(store, {
    pull: (cursor) =>
      rpc("pull_study_changes", { p_cursor: cursor, p_limit: 200 }),
    push: (op) => rpc("push_study_operation", { p_operation: op }),
  });
  if (await store.transaction((tx) => tx.get("meta", "deleteCloudInk"))) {
    await rpc("delete_study_ink", {});
    await store.transaction(async (tx) => {
      for (const op of await tx.all<
        import("../../db/local/types").PendingOperation
      >("outbox"))
        if (op.kind === "ink") await tx.remove("outbox", op.key);
      for (const conflict of await tx.all<
        import("../../db/local/types").Conflict
      >("conflicts"))
        if (conflict.local.kind === "ink") {
          await tx.set("entities", conflict.key, conflict.remote);
          await tx.remove("conflicts", conflict.key);
        }
      await tx.set("meta", "deleteCloudInk", false);
    });
    await synchronize(store, {
      pull: (cursor) =>
        rpc("pull_study_changes", { p_cursor: cursor, p_limit: 200 }),
      push: (op) => rpc("push_study_operation", { p_operation: op }),
    });
  }
  const migrated = await store.transaction((tx) =>
    tx.get("entities", entityKey("marker", "legacy-cloud-v1")),
  );
  if (!migrated) {
    const rows: LegacyRows = {};
    for (const table of [
      "decks",
      "cards",
      "review_stats",
      "sessions",
      "test_attempts",
      "test_questions",
      "review_events",
    ]) {
      rows[table] = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await client
          .from(table)
          .select("*")
          .eq("user_id", account)
          .order(table === "review_stats" ? "card_id" : "id")
          .range(start, start + 499);
        if (error) {
          if (
            table === "review_events" &&
            ["42P01", "PGRST205"].includes(error.code)
          )
            break;
          throw new Error(
            "The previous cloud library could not be downloaded. Retry sync.",
          );
        }
        rows[table].push(...data);
        if (data.length < 500) break;
      }
    }
    await store.transaction(async (tx) => {
      await importLegacy(tx, rows);
      await writeEntity(tx, "marker", "legacy-cloud-v1", { imported: true });
    });
    await synchronize(store, {
      pull: (cursor) =>
        rpc("pull_study_changes", { p_cursor: cursor, p_limit: 200 }),
      push: (op) => rpc("push_study_operation", { p_operation: op }),
    });
  }
  studyChanged();
}
export function syncStudy() {
  const account = studyStore().account;
  if (!jobs.has(account))
    jobs.set(
      account,
      runSync().finally(() => jobs.delete(account)),
    );
  return jobs.get(account)!;
}
