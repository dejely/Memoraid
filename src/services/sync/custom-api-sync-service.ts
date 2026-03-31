import { Platform } from "react-native";

import { APP_NAME } from "../../constants/app";
import {
  acknowledgeSyncQueueEntries,
  applyRemoteChangeSet,
  getPendingSyncQueue,
  getSyncCursor,
  getSyncStatusSnapshot,
  markSyncQueueEntriesFailed,
  patchSyncState,
} from "../../db/repositories/sync-repository";
import { nowIso } from "../../utils/date";
import type {
  BackendConfig,
  SyncChangeSet,
  SyncQueueEntry,
  SyncRunSummary,
  SyncStatus,
  SyncVerificationResult,
} from "../../types/models";
import type { SyncService } from "./types";

type DiscoveryResponse = {
  service?: string;
  version?: string | null;
  capabilities?: string[];
};

type PushResponse = {
  acknowledgedIds?: string[];
  cursor?: string | null;
  changes?: Partial<SyncChangeSet>;
};

type PullResponse = {
  cursor?: string | null;
  changes?: Partial<SyncChangeSet>;
};

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function normalizeChangeSet(value: Partial<SyncChangeSet> | null | undefined): SyncChangeSet {
  return {
    decks: Array.isArray(value?.decks) ? value.decks : [],
    deletedDeckIds: Array.isArray(value?.deletedDeckIds) ? value.deletedDeckIds : [],
    testAttempts: Array.isArray(value?.testAttempts) ? value.testAttempts : [],
  };
}

function formatFetchError(error: unknown): string {
  return error instanceof Error ? error.message : "The sync request failed.";
}

export class CustomApiSyncService implements SyncService {
  constructor(private readonly config: BackendConfig) {}

  private get apiBaseUrl(): string {
    if (!this.config.apiBaseUrl) {
      throw new Error("Add your backend API URL before enabling sync.");
    }

    return normalizeBaseUrl(this.config.apiBaseUrl);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(this.config.accessToken ? { Authorization: `Bearer ${this.config.accessToken}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as T) : ({} as T);

    if (!response.ok) {
      const message =
        typeof parsed === "object" && parsed && "message" in parsed && typeof parsed.message === "string"
          ? parsed.message
          : `Sync request failed with status ${response.status}.`;
      throw new Error(message);
    }

    return parsed;
  }

  async getStatus(): Promise<SyncStatus> {
    return getSyncStatusSnapshot(this.config);
  }

  async verifyConnection(): Promise<SyncVerificationResult> {
    await patchSyncState({
      provider: this.config.provider,
      api_base_url: this.config.apiBaseUrl,
      state: "verifying",
      last_error: null,
    });

    try {
      const discovery = await this.request<DiscoveryResponse>("/.well-known/memoraid-sync", {
        method: "GET",
      });

      if (discovery.service !== "memoraid-sync") {
        throw new Error("The backend did not identify itself as a Memoraid sync server.");
      }

      const checkedAt = nowIso();

      await patchSyncState({
        provider: this.config.provider,
        api_base_url: this.config.apiBaseUrl,
        state: "ready",
        last_error: null,
        last_verified_at: checkedAt,
        server_name: discovery.service,
        server_version: discovery.version ?? null,
      });

      return {
        server: {
          service: discovery.service,
          version: discovery.version ?? null,
          capabilities: Array.isArray(discovery.capabilities) ? discovery.capabilities : [],
          checkedAt,
        },
      };
    } catch (error) {
      await patchSyncState({
        provider: this.config.provider,
        api_base_url: this.config.apiBaseUrl,
        state: "error",
        last_error: formatFetchError(error),
      });
      throw error;
    }
  }

  async push(): Promise<void> {
    const queueEntries = await getPendingSyncQueue();

    if (queueEntries.length === 0) {
      return;
    }

    try {
      const cursor = await getSyncCursor();
      const response = await this.request<PushResponse>("/v1/sync/push", {
        method: "POST",
        body: JSON.stringify({
          cursor,
          client: {
            app: APP_NAME,
            platform: Platform.OS,
          },
          changes: queueEntries.map((entry) => ({
            id: entry.id,
            entityType: entry.entityType,
            entityId: entry.entityId,
            operation: entry.operation,
            payload: JSON.parse(entry.payloadJson),
            updatedAt: entry.updatedAt,
          })),
        }),
      });

      const acknowledgedIds = Array.isArray(response.acknowledgedIds)
        ? response.acknowledgedIds.filter((value): value is string => typeof value === "string")
        : queueEntries.map((entry) => entry.id);

      await acknowledgeSyncQueueEntries(acknowledgedIds);

      if (response.changes) {
        await applyRemoteChangeSet(normalizeChangeSet(response.changes));
      }

      await patchSyncState({
        last_cursor: response.cursor ?? cursor,
      });
    } catch (error) {
      await markSyncQueueEntriesFailed(
        queueEntries.map((entry: SyncQueueEntry) => entry.id),
        formatFetchError(error),
      );
      throw error;
    }
  }

  async pull(): Promise<void> {
    const cursor = await getSyncCursor();
    const response = await this.request<PullResponse>("/v1/sync/pull", {
      method: "POST",
      body: JSON.stringify({
        cursor,
      }),
    });

    await applyRemoteChangeSet(normalizeChangeSet(response.changes));
    await patchSyncState({
      last_cursor: response.cursor ?? cursor,
    });
  }

  async syncNow(): Promise<SyncRunSummary> {
    if (!this.config.syncEnabled) {
      throw new Error("Enable sync before running a sync.");
    }

    await patchSyncState({
      provider: this.config.provider,
      api_base_url: this.config.apiBaseUrl,
      state: "syncing",
      last_error: null,
    });

    try {
      await this.verifyConnection();
      const pendingBeforePush = await getPendingSyncQueue();
      await this.push();
      await this.pull();

      const statusTimestamp = nowIso();
      await patchSyncState({
        provider: this.config.provider,
        api_base_url: this.config.apiBaseUrl,
        state: "ready",
        last_error: null,
        last_synced_at: statusTimestamp,
      });

      const status = await this.getStatus();

      return {
        pushedCount: pendingBeforePush.length,
        acknowledgedCount: pendingBeforePush.length - status.pendingChanges,
        pulledCounts: {
          decks: 0,
          testAttempts: 0,
        },
        status,
      };
    } catch (error) {
      await patchSyncState({
        provider: this.config.provider,
        api_base_url: this.config.apiBaseUrl,
        state: "error",
        last_error: formatFetchError(error),
      });
      throw error;
    }
  }
}
