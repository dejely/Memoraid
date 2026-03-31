import type { SyncRunSummary, SyncStatus, SyncVerificationResult } from "../../types/models";

export interface SyncService {
  getStatus(): Promise<SyncStatus>;
  verifyConnection(): Promise<SyncVerificationResult>;
  pull(): Promise<void>;
  push(): Promise<void>;
  syncNow(): Promise<SyncRunSummary>;
}
