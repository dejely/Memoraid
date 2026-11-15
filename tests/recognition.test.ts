import test from "node:test";
import assert from "node:assert/strict";
import { runRecognition, validateInput, type RelayInput } from "../supabase/functions/study-ai/recognition";
const input = (): RelayInput => ({
  operation: "recognizeMath",
  image: "data:image/png;base64,AAAA",
  settings: { geminiModel: "gemini-test", openrouterModel: "openrouter/free", fallbackEnabled: true },
  credentials: { gemini: "test-gemini", openrouter: "test-openrouter" },
});
function ok(text = '{"latex":"x^2","unreadable":false}', gemini = true) {
  return new Response(
    JSON.stringify(
      gemini ? { candidates: [{ content: { parts: [{ text }] } }] } : { choices: [{ message: { content: text } }] },
    ),
  );
}
test("primary success avoids fallback; expected answer is never requested", async () => {
  let count = 0;
  const result = await runRecognition(input(), (async (url, options) => {
    count++;
    assert.match(String(url), /googleapis/);
    assert.doesNotMatch(options?.body as string, /correctAnswer/);
    return ok();
  }) as typeof fetch);
  assert.equal(count, 1);
  assert.equal(result.provider, "gemini");
});
for (const failure of [401, 403, 404, 429, 500, "network", "malformed", "timeout"] as const) {
  test(`fallback on ${failure}`, async () => {
    let count = 0;
    const result = await runRecognition(input(), (async () => {
      count++;
      if (count === 1) {
        if (failure === "network" || failure === "timeout") throw new Error(failure);
        return failure === "malformed" ? ok("not JSON") : new Response("private provider details", { status: failure });
      }
      return ok(undefined, false);
    }) as typeof fetch);
    assert.equal(result.provider, "openrouter");
    assert.equal(count, 2);
  });
}
test("unreadable is a valid result and does not trigger fallback", async () => {
  let count = 0;
  const result = await runRecognition(input(), (async () => {
    count++;
    return ok('{"latex":"","unreadable":true}');
  }) as typeof fetch);
  assert.equal(count, 1);
  assert.equal(result.unreadable, true);
});
test("single-provider configuration and disabled fallback", async () => {
  const single = input();
  single.credentials.gemini = "";
  assert.equal(
    (await runRecognition(single, (async () => ok(undefined, false)) as typeof fetch)).provider,
    "openrouter",
  );
  const disabled = input();
  disabled.settings.fallbackEnabled = false;
  let count = 0;
  await assert.rejects(
    runRecognition(disabled, (async () => {
      count++;
      return new Response("secret", { status: 500 });
    }) as typeof fetch),
    /gemini/,
  );
  assert.equal(count, 1);
});
test("validation, missing keys and cancellation stop before provider calls", async () => {
  assert.throws(() => validateInput({ ...input(), image: "https://example.com/ink" }));
  const empty = input();
  empty.credentials = { gemini: "", openrouter: "" };
  await assert.rejects(runRecognition(empty), /Add an API key/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    runRecognition(
      input(),
      (() => {
        throw new Error("Must not call");
      }) as typeof fetch,
      controller.signal,
    ),
    /cancelled/,
  );
});
test("total failure never reflects provider bodies or keys", async () => {
  await assert.rejects(
    runRecognition(input(), (async () => new Response("SECRET", { status: 401 })) as typeof fetch),
    (error: Error) => !/SECRET|test-gemini|test-openrouter/.test(error.message),
  );
});
test("provider deadline aborts the request before falling back", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let count = 0;
  const pending = runRecognition(input(), (async (_url, options) => {
    count++;
    if (count > 1) return ok(undefined, false);
    return new Promise<Response>((_resolve, reject) =>
      options!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }),
    );
  }) as typeof fetch);
  t.mock.timers.tick(20000);
  assert.equal((await pending).provider, "openrouter");
  assert.equal(count, 2);
});
test("cancellation during a provider request never calls fallback", async () => {
  const controller = new AbortController();
  let count = 0;
  const pending = runRecognition(
    input(),
    (async (_url, options) => {
      count++;
      return new Promise<Response>((_resolve, reject) =>
        options!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }),
      );
    }) as typeof fetch,
    controller.signal,
  );
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  assert.equal(count, 1);
});
