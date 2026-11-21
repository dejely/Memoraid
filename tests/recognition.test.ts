import test from "node:test";
import assert from "node:assert/strict";
import {
  runRecognition,
  validateInput,
  type RelayInput,
} from "../supabase/functions/study-ai/recognition";

const unimernet = { url: "http://recognition.test/recognize", token: "private-service-token" };
const input = (): RelayInput => ({
  operation: "recognizeMath",
  image: "data:image/png;base64,iVBORw0KGgo=",
  settings: { geminiModel: "gemini-test", openrouterModel: "openrouter/free", fallbackEnabled: true },
  credentials: { gemini: "test-gemini", openrouter: "test-openrouter" },
});
const transcription = { latex: "x^2", unreadable: false };
const unreadable = { latex: "", unreadable: true };
const visionResult = (value = transcription) =>
  Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });

test("UniMERNet works without API keys and receives only the image", async () => {
  const value = input();
  value.credentials = { gemini: "", openrouter: "" };
  value.settings.geminiModel = "old, unsupported Gemini model";
  let calls = 0;
  const result = await runRecognition(validateInput(value), async (url, options) => {
    calls++;
    assert.equal(String(url), unimernet.url);
    assert.equal(options?.redirect, "error");
    assert.deepEqual(options?.headers, {
      Authorization: "Bearer private-service-token",
      "Content-Type": "image/png",
    });
    assert.deepEqual(options?.body, Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10));
    return Response.json(transcription);
  }, undefined, undefined, unimernet);
  assert.deepEqual(result, { ...transcription, provider: "unimernet", model: "unimernet-tiny" });
  assert.equal(calls, 1);
});

for (const failure of [429, 503, "network", "malformed", "empty", "unreadable"] as const) {
  test(`UniMERNet ${failure} falls back only to free OpenRouter`, async () => {
    const calls: string[] = [];
    const result = await runRecognition(input(), async (url, options) => {
      calls.push(String(url));
      if (calls.length === 1) {
        if (failure === "network") throw new Error("connection lost");
        if (failure === "malformed") return new Response("not JSON");
        if (failure === "empty") return Response.json({ ...transcription, latex: " " });
        if (failure === "unreadable") return Response.json(unreadable);
        return new Response("private provider details", { status: failure });
      }
      assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-openrouter");
      assert.equal(new Headers(options?.headers).get("x-goog-api-key"), null);
      const body = JSON.parse(options?.body as string);
      assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0, request: 0 });
      assert.equal(body.messages[0].content[1].image_url.url, input().image);
      return visionResult();
    }, undefined, undefined, unimernet);
    assert.deepEqual(calls, [unimernet.url, "https://openrouter.ai/api/v1/chat/completions"]);
    assert.equal(result.provider, "openrouter");
  });
}

test("no AI calls when fallback is disabled or the only personal key is Gemini", async () => {
  for (const reason of ["disabled", "gemini-only"]) {
    const value = input();
    if (reason === "disabled") value.settings.fallbackEnabled = false;
    else value.credentials.openrouter = "";
    let calls = 0;
    await assert.rejects(runRecognition(value, async () => {
      calls++;
      return new Response("service down", { status: 503 });
    }, undefined, undefined, unimernet), /UniMERNet is unavailable/);
    assert.equal(calls, 1);
  }
});

test("an unreadable result is returned when fallback is off", async () => {
  const value = input();
  value.settings.fallbackEnabled = false;
  const result = await runRecognition(value, async () => Response.json(unreadable),
    undefined, undefined, unimernet);
  assert.equal(result.provider, "unimernet");
  assert.equal(result.unreadable, true);
});

test("an invalid PNG does not fall back", async () => {
  let calls = 0;
  await assert.rejects(runRecognition(input(), async () => {
    calls++;
    return new Response("private body", { status: 400 });
  }, undefined, undefined, unimernet), /valid PNG/);
  assert.equal(calls, 1);
});

test("missing deployment uses configured free fallback only", async () => {
  const result = await runRecognition(input(), async (url) => {
    assert.equal(String(url), "https://openrouter.ai/api/v1/chat/completions");
    return visionResult(unreadable);
  });
  assert.equal(result.provider, "openrouter");
  assert.equal(result.unreadable, true);

  const value = input();
  value.credentials.openrouter = "";
  await assert.rejects(runRecognition(value, async () => {
    assert.fail("Gemini must not be called for handwriting");
  }), /UniMERNet is unavailable/);
});

test("validation and cancellation stop before provider calls", async () => {
  assert.throws(() => validateInput({ ...input(), image: "https://example.com/ink" }));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runRecognition(input(), async () => {
    assert.fail("Cancelled requests must not contact any provider");
  }, controller.signal, undefined, unimernet), /cancelled/);
});

test("total failure never reflects provider bodies or keys", async () => {
  await assert.rejects(
    runRecognition(input(), async () => new Response("SECRET", { status: 401 }),
      undefined, undefined, unimernet),
    (error: Error) => /openrouter/.test(error.message) &&
      !/SECRET|test-gemini|test-openrouter|private-service-token/.test(error.message),
  );
});

test("the primary deadline aborts its request before fallback", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let count = 0;
  const pending = runRecognition(input(), async (_url, options) => {
    count++;
    if (count > 1) return visionResult();
    return new Promise<Response>((_resolve, reject) =>
      options!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }),
    );
  }, undefined, undefined, unimernet);
  t.mock.timers.tick(12000);
  assert.equal((await pending).provider, "openrouter");
  assert.equal(count, 2);
});

test("cancellation during primary inference never calls fallback", async () => {
  const controller = new AbortController();
  let count = 0;
  const pending = runRecognition(input(), async (_url, options) => {
    count++;
    return new Promise<Response>((_resolve, reject) =>
      options!.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }),
    );
  }, controller.signal, undefined, unimernet);
  controller.abort();
  await assert.rejects(pending, /cancelled/);
  assert.equal(count, 1);
});
