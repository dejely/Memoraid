import { storedProjection } from "../../features/progress/persistence";
import type {
  Entity,
  LocalStore,
  PendingOperation,
} from "../../db/local/types";
import { acknowledge, mergeRemote } from "../../db/local/operations";
import {
  projectEvent,
  type ProgressProjection,
} from "../../features/progress/projection";
import type { ReviewEvent } from "../../features/progress/model";
export interface SyncTransport {
  pull(
    cursor: number,
  ): Promise<{ changes: Entity[]; cursor: number; more: boolean }>;
  push(
    operation: PendingOperation,
  ): Promise<{ entity: Entity; conflict: boolean }>;
}
export async function synchronize(store: LocalStore, transport: SyncTransport) {
  async function pull() {
    let more = true;
    while (more) {
      const cursor = await store.transaction(
        async (tx) => (await tx.get<number>("meta", "cursor")) ?? 0,
      );
      const page = await transport.pull(cursor);
      if (page.more && page.cursor <= cursor)
        throw new Error("Sync cursor did not advance.");
      await store.transaction(async (tx) => {
        for (const remote of page.changes) {
          await mergeRemote(tx, remote);
          if (
            remote.kind === "ink" &&
            !remote.deleted &&
            !(await tx.get("meta", `local-ink:${remote.id}`))
          ) {
            await tx.set("meta", `local-ink:${remote.id}`, remote.payload);
            const ids = (await tx.get<string[]>("meta", "inkIds")) ?? [];
            if (!ids.includes(remote.id)) {
              ids.push(remote.id);
              await tx.set("meta", "inkIds", ids);
            }
          }
          if (remote.kind === "review" && !remote.deleted) {
            const projection = await storedProjection(tx);
            await tx.set(
              "meta",
              "progress",
              projectEvent(projection, remote.payload as ReviewEvent),
            );
          }
        }
        await tx.set("meta", "cursor", page.cursor);
      });
      more = page.more;
    }
  }
  await pull();
  const pending = await store.transaction((tx) =>
    tx.all<PendingOperation>("outbox"),
  );
  for (const op of pending) {
    const send = await store.transaction(async (tx) => {
      if (await tx.get("conflicts", op.key)) return false;
      if (
        op.kind === "ink" &&
        !op.deleted &&
        !(await tx.get("meta", "inkSync"))
      )
        return false;
      return (await tx.get<PendingOperation>("outbox", op.key))?.id === op.id;
    });
    if (!send) continue;
    const response = await transport.push(op);
    await store.transaction((tx) =>
      acknowledge(tx, op, response.entity, response.conflict),
    );
  }
  await pull();
  await store.transaction((tx) =>
    tx.set("meta", "lastSyncedAt", new Date().toISOString()),
  );
}
