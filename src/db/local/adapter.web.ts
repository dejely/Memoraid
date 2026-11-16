import Dexie, { type Table } from "dexie";
import type { Bucket, LocalStore, LocalTransaction } from "./types";
class AccountDatabase extends Dexie {
  entities!: Table<{ key: string; value: unknown }>;
  outbox!: Table<{ key: string; value: unknown }>;
  conflicts!: Table<{ key: string; value: unknown }>;
  meta!: Table<{ key: string; value: unknown }>;
  constructor(account: string) {
    super(`memoraid-${account}`);
    this.version(1).stores({
      entities: "&key",
      outbox: "&key",
      conflicts: "&key",
      meta: "&key",
    });
  }
}
export function openAccountStore(account: string): LocalStore {
  const db = new AccountDatabase(account);
  return {
    account,
    transaction: (work) =>
      db.transaction(
        "rw",
        db.entities,
        db.outbox,
        db.conflicts,
        db.meta,
        async () => {
          const tx: LocalTransaction = {
            get: async <T>(bucket: Bucket, key: string) =>
              (await db[bucket].get(key))?.value as T | undefined,
            all: async <T>(bucket: Bucket) =>
              (await db[bucket].toArray()).map((row) => row.value as T),
            set: async (bucket, key, value) => {
              await db[bucket].put({ key, value });
            },
            remove: async (bucket, key) => {
              await db[bucket].delete(key);
            },
          };
          return work(tx);
        },
      ),
  };
}
