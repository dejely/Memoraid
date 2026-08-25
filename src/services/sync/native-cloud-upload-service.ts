import * as SecureStore from "expo-secure-store";

import { getDatabase } from "../../db/client";
import { getSupabaseClient } from "../auth/supabase-client";

type UploadResult = {
  decks: number;
  cards: number;
  reviews: number;
  sessions: number;
  attempts: number;
  questions: number;
};

type Row = Record<string, unknown>;

const PAGE_SIZE = 500;

function migrationKey(userId: string): string {
  return `memoraid.cloud-upload.${userId}`;
}

function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      return parseArray(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
}

async function readAllCloudDeckIds(): Promise<string[]> {
  const client = getSupabaseClient();
  const ids: string[] = [];

  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await client
      .from("decks")
      .select("id")
      .order("id", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Cloud data could not be checked: ${error.message}`);
    }

    ids.push(...(data ?? []).map((row) => row.id));

    if (!data || data.length < PAGE_SIZE) {
      return ids;
    }
  }
}

async function insertMissingRows(table: string, rows: Row[], onConflict: string): Promise<void> {
  const client = getSupabaseClient();

  for (let index = 0; index < rows.length; index += PAGE_SIZE) {
    const batch = rows.slice(index, index + PAGE_SIZE);
    const { error } = await client.from(table).upsert(batch, {
      ignoreDuplicates: true,
      onConflict,
    });

    if (error) {
      throw new Error(`Local ${table.replace(/_/g, " ")} could not be uploaded: ${error.message}`);
    }
  }
}

export async function hasCompletedNativeCloudUpload(userId: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(migrationKey(userId))) === "complete";
}

export async function getLocalDeckCount(): Promise<number> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM decks;");
  return row?.count ?? 0;
}

export async function uploadNativeDataToCloud(userId: string): Promise<UploadResult> {
  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError || authData.user?.id !== userId) {
    throw new Error("Your sign-in session changed. Sign in again before uploading local data.");
  }

  if (await hasCompletedNativeCloudUpload(userId)) {
    throw new Error("This device has already uploaded its local study data to this account.");
  }

  const database = await getDatabase();
  const [decks, cards, sessions, reviews, attempts, questions] = await Promise.all([
    database.getAllAsync<Row>("SELECT * FROM decks ORDER BY created_at ASC;"),
    database.getAllAsync<Row>("SELECT * FROM cards ORDER BY created_at ASC;"),
    database.getAllAsync<Row>("SELECT * FROM sessions ORDER BY started_at ASC;"),
    database.getAllAsync<Row>("SELECT * FROM review_stats;"),
    database.getAllAsync<Row>("SELECT * FROM test_attempts ORDER BY started_at ASC;"),
    database.getAllAsync<Row>("SELECT * FROM test_questions ORDER BY created_at ASC;"),
  ]);

  if (decks.length === 0) {
    await SecureStore.setItemAsync(migrationKey(userId), "complete");
    return { decks: 0, cards: 0, reviews: 0, sessions: 0, attempts: 0, questions: 0 };
  }

  const cloudDeckIds = await readAllCloudDeckIds();
  const localDeckIds = new Set(decks.map((row) => String(row.id)));
  const unrelatedCloudDecks = cloudDeckIds.filter((id) => !localDeckIds.has(id));

  if (unrelatedCloudDecks.length > 0) {
    throw new Error(
      "This account already contains different cloud study sets. To protect both libraries, automatic upload was stopped.",
    );
  }

  const owned = (row: Row): Row => ({ ...row, user_id: userId });
  const deckRows = decks.map((row) => owned({ ...row, tags_json: parseArray(row.tags_json) }));
  const cardRows = cards.map(owned);
  const sessionRows = sessions.map((row) =>
    owned({
      ...row,
      order_json: parseArray(row.order_json),
      shuffle_enabled: row.shuffle_enabled === 1,
    }),
  );
  const reviewRows = reviews.map(owned);
  const attemptRows = attempts.map(owned);
  const questionRows = questions.map((row) =>
    owned({
      ...row,
      options_json: row.options_json === null ? null : parseArray(row.options_json),
      is_correct: row.is_correct === null ? null : row.is_correct === 1,
    }),
  );

  // Every step ignores existing IDs, so an interrupted upload can safely be resumed.
  await insertMissingRows("decks", deckRows, "user_id,id");
  await insertMissingRows("cards", cardRows, "user_id,id");
  await insertMissingRows("sessions", sessionRows, "user_id,id");
  await insertMissingRows("review_stats", reviewRows, "user_id,card_id");
  await insertMissingRows("test_attempts", attemptRows, "user_id,id");
  await insertMissingRows("test_questions", questionRows, "user_id,id");
  await SecureStore.setItemAsync(migrationKey(userId), "complete");

  return {
    decks: deckRows.length,
    cards: cardRows.length,
    reviews: reviewRows.length,
    sessions: sessionRows.length,
    attempts: attemptRows.length,
    questions: questionRows.length,
  };
}

