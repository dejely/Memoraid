import test from "node:test";
import assert from "node:assert/strict";
import { clearWebAiCredentials, loadAiConfiguration, saveAiConfiguration } from "../src/services/secure/ai-storage.web";
import { DEFAULT_AI_SETTINGS } from "../src/services/ai/config";
test("browser credentials stay account-scoped in session storage and clear on sign-out", async (t) => {
  const values = new Map<string, string>();
  const storage = {
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { value: { sessionStorage: storage }, configurable: true });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  });
  await saveAiConfiguration("account-a", DEFAULT_AI_SETTINGS, { gemini: "fixture-a", openrouter: "" });
  assert.equal((await loadAiConfiguration("account-a")).credentials.gemini, "fixture-a");
  assert.equal((await loadAiConfiguration("account-b")).credentials.gemini, "");
  storage.setItem("unrelated-preference", "keep");
  await clearWebAiCredentials();
  assert.equal((await loadAiConfiguration("account-a")).credentials.gemini, "");
  assert.equal(storage.getItem("unrelated-preference"), "keep");
});
