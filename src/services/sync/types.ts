import type { SyncStatus } from "../../types/models";

export interface SyncService {
  getStatus(): Promise<SyncStatus>;
  pull(): Promise<void>;
  push(): Promise<void>;
}
