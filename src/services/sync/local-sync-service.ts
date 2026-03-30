import type { SyncService } from "./types";
import type { SyncStatus } from "../../types/models";

export class LocalSyncService implements SyncService {
  async getStatus(): Promise<SyncStatus> {
    return {
      provider: "local-only",
      lastSyncedAt: null,
      state: "disabled",
    };
  }

  async pull(): Promise<void> {}

  async push(): Promise<void> {}
}

export const syncService = new LocalSyncService();
