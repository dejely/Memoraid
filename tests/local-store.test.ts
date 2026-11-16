import test from "node:test";
import assert from "node:assert/strict";
import type {
  Bucket,
  Entity,
  LocalStore,
  LocalTransaction,
  PendingOperation,
} from "../src/db/local/types";
import {
  writeEntity,
  entities,
  resolveConflict,
} from "../src/db/local/operations";
import { synchronize } from "../src/services/sync/engine";
import { saveInk, readInk } from "../src/features/practice/ink-storage";
function memory(account = "user-a"): LocalStore {
  let data: Record<Bucket, Map<string, unknown>> = {
    entities: new Map(),
    outbox: new Map(),
    conflicts: new Map(),
    meta: new Map(),
  };
  return {
    account,
    async transaction(work) {
      const copy = structuredClone(data);
      const tx: LocalTransaction = {
        get: async (bucket, key) => copy[bucket].get(key) as any,
        all: async (bucket) => [...copy[bucket].values()] as any,
        set: async (bucket, key, value) => {
          copy[bucket].set(key, value);
        },
        remove: async (bucket, key) => {
          copy[bucket].delete(key);
        },
      };
      const result = await work(tx);
      data = copy;
      return result;
    },
  };
}
const remote = (payload: unknown, version = 1): Entity => ({
  key: "deck:d",
  kind: "deck",
  id: "d",
  payload,
  version,
  deleted: false,
});
test("transaction rolls back both attempt and outbox; stores isolate accounts", async () => {
  const a = memory(),
    b = memory("user-b");
  await assert.rejects(
    a.transaction(async (tx) => {
      await writeEntity(tx, "attempt", "a", { answer: "x" });
      throw new Error("disk failure");
    }),
  );
  assert.equal((await a.transaction((tx) => tx.all("entities"))).length, 0);
  assert.equal((await a.transaction((tx) => tx.all("outbox"))).length, 0);
  await a.transaction((tx) => writeEntity(tx, "deck", "d", { title: "A" }));
  assert.equal((await b.transaction((tx) => tx.all("entities"))).length, 0);
});
test("failed push remains pending; repeated sync and remote cursor are idempotent", async () => {
  const store = memory();
  await store.transaction((tx) =>
    writeEntity(tx, "deck", "d", { title: "local" }),
  );
  let sends = 0;
  const transport = {
    pull: async () => ({ changes: [], cursor: 0, more: false }),
    push: async (op: PendingOperation) => {
      sends++;
      if (sends === 1) throw new Error("offline");
      return { entity: remote(op.payload), conflict: false };
    },
  };
  await assert.rejects(synchronize(store, transport));
  assert.equal((await store.transaction((tx) => tx.all("outbox"))).length, 1);
  await synchronize(store, transport);
  await synchronize(store, transport);
  assert.equal(sends, 2);
  assert.equal((await store.transaction((tx) => tx.all("outbox"))).length, 0);
});
test("edit during push survives acknowledgement and advances its base version", async () => {
  const store = memory();
  await store.transaction((tx) =>
    writeEntity(tx, "deck", "d", { title: "first" }),
  );
  await synchronize(store, {
    pull: async () => ({ changes: [], cursor: 0, more: false }),
    push: async (op) => {
      await store.transaction((tx) =>
        writeEntity(tx, "deck", "d", { title: "second" }),
      );
      return { entity: remote(op.payload), conflict: false };
    },
  });
  const pending = await store.transaction((tx) =>
    tx.get<PendingOperation>("outbox", "deck:d"),
  );
  assert.equal(pending?.payload.title, "second");
  assert.equal(pending?.baseVersion, 1);
});
test("conflicting edits retain both versions until explicit resolution; tombstones propagate", async () => {
  const store = memory();
  await store.transaction((tx) =>
    writeEntity(tx, "deck", "d", { title: "device" }),
  );
  const cloud = remote({ title: "cloud" }, 2);
  await synchronize(store, {
    pull: async () => ({ changes: [cloud], cursor: 2, more: false }),
    push: async () => {
      throw new Error("conflict must not push");
    },
  });
  assert.equal(
    (await store.transaction((tx) => tx.all("conflicts"))).length,
    1,
  );
  assert.equal(
    (
      await store.transaction((tx) => entities<{ title: string }>(tx, "deck"))
    )[0].payload.title,
    "device",
  );
  await store.transaction((tx) => resolveConflict(tx, "deck:d", "local"));
  assert.equal(
    (
      await store.transaction((tx) =>
        tx.get<PendingOperation>("outbox", "deck:d"),
      )
    )?.baseVersion,
    2,
  );
  await store.transaction((tx) => resolveConflict(tx, "deck:d", "remote"));
});
test("ink stays local by default and cloud tombstones preserve local replay", async () => {
  const store = memory(),
    ink = {
      width: 1000,
      height: 400,
      strokes: [[[1, 2, 3] as [number, number, number]]],
    };
  await store.transaction((tx) => saveInk(tx, "a", ink));
  assert.equal((await store.transaction((tx) => tx.all("outbox"))).length, 0);
  await store.transaction(async (tx) => {
    await tx.set("meta", "inkSync", true);
    await saveInk(tx, "a", ink);
  });
  assert.equal((await store.transaction((tx) => tx.all("outbox"))).length, 1);
  await store.transaction((tx) => writeEntity(tx, "ink", "a", null, true));
  await synchronize(store, {
    pull: async () => ({ changes: [], cursor: 0, more: false }),
    push: async (op) => ({
      entity: {
        key: op.key,
        kind: "ink",
        id: "a",
        payload: null,
        deleted: true,
        version: 1,
      },
      conflict: false,
    }),
  });
  assert.deepEqual(await store.transaction((tx) => readInk(tx, "a")), ink);
});
test("JSON object key order from PostgreSQL does not create a false conflict", async () => {
  const store = memory();
  await store.transaction((tx) =>
    writeEntity(tx, "deck", "d", { title: "same", description: "same" }),
  );
  await synchronize(store, {
    pull: async () => ({
      changes: [remote({ description: "same", title: "same" })],
      cursor: 1,
      more: false,
    }),
    push: async () => {
      throw new Error("should recognize identical content");
    },
  });
  assert.equal(
    (await store.transaction((tx) => tx.all("conflicts"))).length,
    0,
  );
  assert.equal((await store.transaction((tx) => tx.all("outbox"))).length, 0);
});
test("first sync after a projection reset preserves older review rewards", async () => {
  const store = memory();
  const review = (id: string) => ({
    id,
    card_id: id,
    deck_id: "d",
    happened_at: "2026-11-17T10:00:00Z",
    study_date: "2026-11-17",
    timezone: "UTC",
    result: "correct",
    was_due: false,
    was_weak: false,
    grading_method: "automatic",
  });
  await store.transaction((tx) =>
    writeEntity(tx, "review", "old", review("old"), false, false),
  );
  const remoteEvent: Entity = {
    key: "review:new",
    id: "new",
    kind: "review",
    payload: review("new"),
    deleted: false,
    version: 1,
  };
  await synchronize(store, {
    pull: async () => ({ changes: [remoteEvent], cursor: 1, more: false }),
    push: async () => {
      throw new Error("No pending operations");
    },
  });
  const { readProjection } =
    await import("../src/features/progress/projection");
  const projection = await store.transaction((tx) =>
    tx.get<any>("meta", "progress"),
  );
  assert.equal(readProjection(projection, "2026-11-17").xp, 30);
});
