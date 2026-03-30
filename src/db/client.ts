import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { LATEST_DB_VERSION, MIGRATIONS } from "./schema";
import { seedDatabaseIfNeeded } from "./seed";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function openDatabase(): Promise<SQLiteDatabase> {
  const database = await openDatabaseAsync("quiztography.db");
  await database.execAsync("PRAGMA foreign_keys = ON;");

  return database;
}

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabase();
  }

  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();
  const versionResult = await database.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  const currentVersion = versionResult?.user_version ?? 0;

  if (currentVersion < LATEST_DB_VERSION) {
    for (let version = currentVersion + 1; version <= LATEST_DB_VERSION; version += 1) {
      const migration = MIGRATIONS[version];

      if (!migration) {
        continue;
      }

      await database.execAsync(migration);
      await database.execAsync(`PRAGMA user_version = ${version};`);
    }
  }

  await seedDatabaseIfNeeded(database);
}
