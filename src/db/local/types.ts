export type Bucket = "entities" | "outbox" | "conflicts" | "meta";
export interface LocalTransaction {
  get<T>(bucket: Bucket, key: string): Promise<T | undefined>;
  all<T>(bucket: Bucket): Promise<T[]>;
  set<T>(bucket: Bucket, key: string, value: T): Promise<void>;
  remove(bucket: Bucket, key: string): Promise<void>;
}
export interface LocalStore {
  account: string;
  transaction<T>(work: (tx: LocalTransaction) => Promise<T>): Promise<T>;
}
export type EntityKind =
  | "deck"
  | "session"
  | "test"
  | "attempt"
  | "review"
  | "ink"
  | "baseline"
  | "marker";
export interface Entity<T = any> {
  key: string;
  kind: EntityKind;
  id: string;
  payload: T;
  version: number;
  deleted: boolean;
}
export interface PendingOperation {
  id: string;
  key: string;
  kind: EntityKind;
  entityId: string;
  baseVersion: number;
  payload: any;
  deleted: boolean;
}
export interface Conflict {
  key: string;
  local: Entity;
  remote: Entity;
}
export const entityKey = (kind: string, id: string) => `${kind}:${id}`;
