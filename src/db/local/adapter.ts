import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { Bucket, LocalStore, LocalTransaction } from "./types";
export function openAccountStore(account: string): LocalStore {
  if (!/^[a-zA-Z0-9_-]+$/.test(account))
    throw new Error("Invalid account identifier.");
  const opening = (async () => {
    const db = await openDatabaseAsync(`memoraid-${account}.db`);
    await db.execAsync(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS account_records (bucket TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(bucket,key));",
    );
    return db;
  })();
  let queue: Promise<unknown> = Promise.resolve();
  return {
    account,
    transaction<T>(work: (tx: LocalTransaction) => Promise<T>): Promise<T> {
      const pending = queue.then(async () => {
        const db = await opening;
        let result!: T;
        await db.withExclusiveTransactionAsync(async (sql) => {
          const tx: LocalTransaction = {
            get: async <V>(bucket: Bucket, key: string) => {
              const row = await sql.getFirstAsync<{ value: string }>(
                "SELECT value FROM account_records WHERE bucket=? AND key=?",
                [bucket, key],
              );
              return row ? (JSON.parse(row.value) as V) : undefined;
            },
            all: async <V>(bucket: Bucket) =>
              (
                await sql.getAllAsync<{ value: string }>(
                  "SELECT value FROM account_records WHERE bucket=?",
                  [bucket],
                )
              ).map((r) => JSON.parse(r.value) as V),
            set: async (bucket, key, value) => {
              await sql.runAsync(
                "INSERT INTO account_records(bucket,key,value) VALUES (?,?,?) ON CONFLICT(bucket,key) DO UPDATE SET value=excluded.value",
                [bucket, key, JSON.stringify(value)],
              );
            },
            remove: async (bucket, key) => {
              await sql.runAsync(
                "DELETE FROM account_records WHERE bucket=? AND key=?",
                [bucket, key],
              );
            },
          };
          result = await work(tx);
        });
        return result;
      });
      queue = pending.catch(() => {});
      return pending;
    },
  };
}
