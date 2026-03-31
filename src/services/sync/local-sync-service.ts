import { getSyncStatusSnapshot, patchSyncState } from "../../db/repositories/sync-repository";
import type { BackendConfig, SyncRunSummary, SyncStatus, SyncVerificationResult } from "../../types/models";
import type { SyncService } from "./types";

export class LocalSyncService implements SyncService {
  constructor(private readonly config: BackendConfig) {}

  async getStatus(): Promise<SyncStatus> {
    return getSyncStatusSnapshot({
      ...this.config,
      provider: "local-only",
      syncEnabled: false,
    });
  }

  async verifyConnection(): Promise<SyncVerificationResult> {
    await patchSyncState({
      provider: "local-only",
      api_base_url: null,
      state: "disabled",
      last_error: null,
      server_name: "Local only",
      server_version: null,
      last_verified_at: null,
    });

    return {
      server: {
        service: "memoraid-local",
        version: null,
        capabilities: [],
        checkedAt: new Date().toISOString(),
      },
    };
  }

  async pull(): Promise<void> {}

  async push(): Promise<void> {}

  async syncNow(): Promise<SyncRunSummary> {
    const status = await this.getStatus();

    return {
      pushedCount: 0,
      acknowledgedCount: 0,
      pulledCounts: {
        decks: 0,
        testAttempts: 0,
      },
      status,
    };
  }
}
