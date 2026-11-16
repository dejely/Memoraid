import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { openAccountStore } from "../src/db/local/adapter.web";
import { writeEntity } from "../src/db/local/operations";
test("IndexedDB persists reopen and rolls back entity and outbox together", async () => {
  const account = `test-${Date.now()}`;
  const store = openAccountStore(account);
  await store.transaction((tx) =>
    writeEntity(tx, "deck", "saved", { title: "offline" }),
  );
  await assert.rejects(
    store.transaction(async (tx) => {
      await writeEntity(tx, "attempt", "partial", { answer: "x" });
      throw new Error("fail");
    }),
  );
  const reopened = openAccountStore(account);
  assert.equal(
    (await reopened.transaction((tx) => tx.all("entities"))).length,
    1,
  );
  assert.equal(
    (await reopened.transaction((tx) => tx.all("outbox"))).length,
    1,
  );
  assert.equal(
    (
      await openAccountStore(account + "-other").transaction((tx) =>
        tx.all("entities"),
      )
    ).length,
    0,
  );
});
