import { openAccountStore } from "./adapter";
import type { LocalStore } from "./types";
let current: LocalStore | null = null;
const stores = new Map<string, LocalStore>();
const listeners = new Set<() => void>();
export function setStudyAccount(account: string | null) {
  if (!account) {
    current = null;
    return;
  }
  if (!stores.has(account)) stores.set(account, openAccountStore(account));
  current = stores.get(account)!;
}
export function studyStore(): LocalStore {
  if (!current) throw new Error("Sign in to open your local library.");
  return current;
}
export function onStudyChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function studyChanged() {
  listeners.forEach((listener) => listener());
}
