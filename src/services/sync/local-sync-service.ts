import type { SyncService } from "./types";
import type { SyncStatus } from "../../types/models";
import { studyStore } from "../../db/local/store";
import { syncStudy } from "./study-sync";
/** Compatibility facade: both entry points run a complete pull/push reconciliation. */
export class LocalSyncService implements SyncService {
  async getStatus(): Promise<SyncStatus> {
    return studyStore().transaction(async (tx) => ({
      provider: "supabase",
      lastSyncedAt: (await tx.get<string>("meta", "lastSyncedAt")) ?? null,
      state: "idle",
    }));
  }
  async pull() {
    await syncStudy();
  }
  async push() {
    await syncStudy();
  }
}
export const syncService = new LocalSyncService();
