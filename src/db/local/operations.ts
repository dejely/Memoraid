import { createId } from "../../utils/ids";
import {
  entityKey,
  type Entity,
  type EntityKind,
  type LocalTransaction,
  type PendingOperation,
  type Conflict,
} from "./types";
function canonical(value: any): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export async function entities<T>(
  tx: LocalTransaction,
  kind: EntityKind,
): Promise<Entity<T>[]> {
  return (await tx.all<Entity<T>>("entities")).filter(
    (e) => e.kind === kind && !e.deleted,
  );
}
export async function writeEntity(
  tx: LocalTransaction,
  kind: EntityKind,
  id: string,
  payload: unknown,
  deleted = false,
  sync = true,
) {
  const key = entityKey(kind, id);
  const previous = await tx.get<Entity>("entities", key);
  const entity: Entity = {
    key,
    kind,
    id,
    payload,
    deleted,
    version: previous?.version ?? 0,
  };
  await tx.set("entities", key, entity);
  const inkEnabled = await tx.get<boolean>("meta", "inkSync");
  if (sync && (kind !== "ink" || inkEnabled || deleted)) {
    await tx.set<PendingOperation>("outbox", key, {
      id: createId("op"),
      key,
      kind,
      entityId: id,
      payload,
      deleted,
      baseVersion: entity.version,
    });
  }
  return entity;
}
export async function mergeRemote(tx: LocalTransaction, remote: Entity) {
  const pending = await tx.get<PendingOperation>("outbox", remote.key);
  const local = await tx.get<Entity>("entities", remote.key);
  if (pending && remote.version > pending.baseVersion) {
    if (
      canonical(pending.payload) === canonical(remote.payload) &&
      pending.deleted === remote.deleted
    ) {
      await tx.remove("outbox", remote.key);
      await tx.remove("conflicts", remote.key);
    } else {
      await tx.set<Conflict>("conflicts", remote.key, {
        key: remote.key,
        local: local!,
        remote,
      });
      return;
    }
  } else if (pending) return;
  if (!local || remote.version >= local.version)
    await tx.set("entities", remote.key, remote);
}
export async function acknowledge(
  tx: LocalTransaction,
  sent: PendingOperation,
  remote: Entity,
  conflict: boolean,
) {
  const pending = await tx.get<PendingOperation>("outbox", sent.key);
  if (conflict) {
    const local = await tx.get<Entity>("entities", sent.key);
    await tx.set<Conflict>("conflicts", sent.key, {
      key: sent.key,
      local: local!,
      remote,
    });
    return;
  }
  await tx.remove("conflicts", sent.key);
  if (pending?.id === sent.id) {
    await tx.remove("outbox", sent.key);
    await tx.set("entities", sent.key, remote);
  } else if (pending) {
    await tx.set("outbox", sent.key, {
      ...pending,
      baseVersion: remote.version,
    });
    const local = await tx.get<Entity>("entities", sent.key);
    if (local)
      await tx.set("entities", sent.key, { ...local, version: remote.version });
  } else await tx.set("entities", sent.key, remote);
}
export async function resolveConflict(
  tx: LocalTransaction,
  key: string,
  choice: "local" | "remote",
) {
  const conflict = await tx.get<Conflict>("conflicts", key);
  if (!conflict) return;
  await tx.remove("outbox", key);
  await tx.set("entities", key, conflict.remote);
  if (choice === "local")
    await writeEntity(
      tx,
      conflict.local.kind,
      conflict.local.id,
      conflict.local.payload,
      conflict.local.deleted,
    );
  if (conflict.local.kind === "review") await tx.remove("meta", "progress");
  await tx.remove("conflicts", key);
}
