import type { FlashcardSession } from "../../types/models";
import { nowIso } from "../../utils/date";
import { createId } from "../../utils/ids";
import { cloudDatabase, jsonStringArray, requireCloudUser, throwIfCloudError } from "./supabase-helpers.web";

type SessionInput = {
  deckId: string;
  currentIndex: number;
  order: string[];
  shuffleEnabled: boolean;
  easyCount: number;
  hardCount: number;
  completedAt?: string | null;
  sessionId?: string | null;
  startedAt?: string | null;
};

export async function getFlashcardSession(deckId: string): Promise<FlashcardSession | null> {
  const result = await cloudDatabase()
    .from("sessions")
    .select("id,deck_id,mode,current_index,order_json,shuffle_enabled,easy_count,hard_count,started_at,updated_at,completed_at")
    .eq("deck_id", deckId)
    .eq("mode", "flashcard")
    .maybeSingle();
  throwIfCloudError(result.error, "The flashcard session could not be loaded");

  if (!result.data) {
    return null;
  }

  return {
    id: result.data.id,
    deckId: result.data.deck_id,
    mode: "flashcard",
    currentIndex: result.data.current_index,
    order: jsonStringArray(result.data.order_json),
    shuffleEnabled: result.data.shuffle_enabled,
    easyCount: result.data.easy_count,
    hardCount: result.data.hard_count,
    startedAt: result.data.started_at,
    updatedAt: result.data.updated_at,
    completedAt: result.data.completed_at,
  };
}

export async function saveFlashcardSession(input: SessionInput): Promise<FlashcardSession> {
  const [existing, user] = await Promise.all([getFlashcardSession(input.deckId), requireCloudUser()]);
  const timestamp = nowIso();
  const startedAt = input.startedAt ?? existing?.startedAt ?? timestamp;
  const sessionId = input.sessionId ?? existing?.id ?? createId("session");
  const client = cloudDatabase();
  const sessionResult = await client.from("sessions").upsert(
    {
      user_id: user.id,
      id: sessionId,
      deck_id: input.deckId,
      mode: "flashcard",
      current_index: input.currentIndex,
      order_json: input.order,
      shuffle_enabled: input.shuffleEnabled,
      easy_count: input.easyCount,
      hard_count: input.hardCount,
      started_at: startedAt,
      updated_at: timestamp,
      completed_at: input.completedAt ?? null,
    },
    { onConflict: "user_id,deck_id,mode" },
  );
  throwIfCloudError(sessionResult.error, "The flashcard session could not be saved");

  const deckResult = await client
    .from("decks")
    .update({ last_studied_at: timestamp })
    .eq("id", input.deckId);
  throwIfCloudError(deckResult.error, "The study-set activity time could not be saved");

  const saved = await getFlashcardSession(input.deckId);

  if (!saved) {
    throw new Error("The flashcard session was saved but could not be reloaded.");
  }

  return saved;
}

