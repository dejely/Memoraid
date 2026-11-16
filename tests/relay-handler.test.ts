import test from "node:test";
import assert from "node:assert/strict";
import { handleRecognitionRequest } from "../supabase/functions/study-ai/handler";
const body = {
  operation: "testConnection",
  provider: "gemini",
  settings: {
    geminiModel: "test",
    openrouterModel: "openrouter/free",
    fallbackEnabled: true,
  },
  credentials: { gemini: "private-fixture", openrouter: "" },
};
const request = (value = JSON.stringify(body), token = "Bearer fixture") =>
  new Request("https://relay.example.test", {
    method: "POST",
    headers: { Authorization: token },
    body: value,
  });
test("missing and invalid app authentication never reaches a provider", async () => {
  const noProvider = (() => {
    throw new Error("Provider must not be called");
  }) as typeof fetch;
  assert.equal(
    (
      await handleRecognitionRequest(
        request(undefined, ""),
        async () => true,
        noProvider,
      )
    ).status,
    401,
  );
  assert.equal(
    (await handleRecognitionRequest(request(), async () => false, noProvider))
      .status,
    401,
  );
});
test("rejects malformed JSON and oversized requests before provider calls", async () => {
  const noProvider = (() => {
    throw new Error("Provider must not be called");
  }) as typeof fetch;
  assert.equal(
    (await handleRecognitionRequest(request("{"), async () => true, noProvider))
      .status,
    400,
  );
  assert.equal(
    (
      await handleRecognitionRequest(
        request("x".repeat(2_100_001)),
        async () => true,
        noProvider,
      )
    ).status,
    413,
  );
});
test("relay responses and telemetry never contain keys or provider response bodies", async () => {
  const metrics: unknown[] = [];
  const response = await handleRecognitionRequest(
    request(),
    async () => true,
    (async () =>
      new Response("private-fixture", { status: 403 })) as typeof fetch,
    (metric) => metrics.push(metric),
  );
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private-fixture/);
  assert.doesNotMatch(
    JSON.stringify(metrics),
    /private-fixture|credentials|image/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("returns request correlation, auth/upstream timing and the actual routed model", async () => {
  const input = {
    ...body,
    provider: "openrouter",
    requestId: "benchmark-1",
    credentials: { gemini: "", openrouter: "fixture" },
    settings: { ...body.settings, openrouterModel: "openrouter/free" },
  };
  const metrics: unknown[] = [];
  const response = await handleRecognitionRequest(
    request(JSON.stringify(input)),
    async () => true,
    (async () =>
      new Response(
        JSON.stringify({
          model: "provider/actual-vision:free",
          choices: [
            { message: { content: '{"latex":"7","unreadable":false}' } },
          ],
        }),
      )) as typeof fetch,
    (m) => metrics.push(m),
  );
  const value = await response.json();
  assert.equal(response.status, 200);
  assert.equal(value.requestId, "benchmark-1");
  assert.equal(value.model, "provider/actual-vision:free");
  assert.ok(value.timings.authMs >= 0 && value.timings.upstreamMs >= 0);
  assert.equal((metrics[0] as { requestId: string }).requestId, "benchmark-1");
});
