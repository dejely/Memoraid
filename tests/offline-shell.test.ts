import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
const { createOfflineWorker } = require("../scripts/offline-worker.cjs");
test("offline navigation normalizes a redirected cached HTML response", async () => {
  const handlers = new Map<string, Function>();
  const cached = new Response("<html>offline shell</html>", {
    headers: {
      "content-type": "text/html",
      "content-encoding": "gzip",
      "content-length": "999",
    },
  });
  Object.defineProperty(cached, "redirected", { value: true });
  let network = 0;
  runInNewContext(createOfflineWorker("test", ["/index.html"]), {
    self: {
      location: { origin: "https://memoraid.test" },
      addEventListener: (type: string, handler: Function) =>
        handlers.set(type, handler),
    },
    caches: { open: async () => ({ match: async () => cached }) },
    Headers,
    Response,
    URL,
    fetch: async () => {
      network++;
      throw new Error("offline");
    },
  });
  let promise!: Promise<Response>;
  handlers.get("fetch")!({
    request: {
      method: "GET",
      url: "https://memoraid.test/practice",
      mode: "navigate",
    },
    respondWith: (value: Promise<Response>) => {
      promise = value;
    },
  });
  const response = await promise;
  assert.equal(response.redirected, false);
  assert.equal(await response.text(), "<html>offline shell</html>");
  assert.equal(response.headers.get("content-encoding"), null);
  assert.equal(network, 0);
  let intercepted = false;
  handlers.get("fetch")!({
    request: { method: "POST", url: "https://memoraid.test/api/recognize" },
    respondWith: () => {
      intercepted = true;
    },
  });
  handlers.get("fetch")!({
    request: {
      method: "GET",
      url: "https://project.supabase.co/rest/v1/cards",
    },
    respondWith: () => {
      intercepted = true;
    },
  });
  assert.equal(intercepted, false);
});
