import { getSyncStatusSnapshot } from "../../db/repositories/sync-repository";
import { loadBackendConfig } from "../secure/preferences-service";
import type { BackendConfig, SyncRunSummary, SyncStatus, SyncVerificationResult } from "../../types/models";
import { CustomApiSyncService } from "./custom-api-sync-service";
import { LocalSyncService } from "./local-sync-service";
import type { SyncService } from "./types";

function createSyncService(config: BackendConfig): SyncService {
  if (!config.syncEnabled || config.provider === "local-only" || !config.apiBaseUrl) {
    return new LocalSyncService(config);
  }

  if (config.provider === "custom-api") {
    return new CustomApiSyncService(config);
  }

  return new LocalSyncService(config);
}

export async function getConfiguredSyncService(): Promise<SyncService> {
  const config = await loadBackendConfig();
  return createSyncService(config);
}

export async function getCurrentSyncStatus(): Promise<SyncStatus> {
  const config = await loadBackendConfig();

  if (!config.syncEnabled || config.provider === "local-only") {
    return getSyncStatusSnapshot({
      ...config,
      provider: "local-only",
      syncEnabled: false,
    });
  }

  return createSyncService(config).getStatus();
}

export async function verifyConfiguredSyncConnection(): Promise<SyncVerificationResult> {
  const service = await getConfiguredSyncService();
  return service.verifyConnection();
}

export async function runConfiguredSyncNow(): Promise<SyncRunSummary> {
  const service = await getConfiguredSyncService();
  return service.syncNow();
}
