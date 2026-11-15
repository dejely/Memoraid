import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AI_SETTINGS, decodeAiConfiguration } from "../src/services/ai/config";
import { runRecognition, validateInput, type RelayInput } from "../supabase/functions/study-ai/recognition";
import { handleRecognitionRequest } from "../supabase/functions/study-ai/handler";
const freeInput = (): RelayInput => ({
  operation: "testConnection",
  provider: "openrouter",
  settings: { geminiModel: "gemini-test", openrouterModel: "openrouter/free", fallbackEnabled: true },
  credentials: { gemini: "", openrouter: "fixture-key" },
});
const providerResponse = () =>
  new Response(JSON.stringify({ choices: [{ message: { content: '{"latex":"x","unreadable":false}' } }] }));
test("default and stored paid OpenRouter selections use the free router without changing keys", () => {
  assert.equal(DEFAULT_AI_SETTINGS.openrouterModel, "openrouter/free");
  const migrated = decodeAiConfiguration(
    JSON.stringify({
      settings: { openrouterModel: "anthropic/claude-sonnet-4.5", geminiModel: "keep-gemini", fallbackEnabled: false },
      credentials: { gemini: "keep-gemini-key", openrouter: "keep-openrouter-key" },
    }),
  );
  assert.equal(migrated.settings.openrouterModel, "openrouter/free");
  assert.equal(migrated.settings.geminiModel, "keep-gemini");
  assert.equal(migrated.settings.fallbackEnabled, false);
  assert.equal(migrated.credentials.openrouter, "keep-openrouter-key");
});
test("explicit free variants remain selectable", () => {
  const value = freeInput();
  value.settings.openrouterModel = "google/gemma-4-31b-it:free";
  assert.equal(validateInput(value).settings.openrouterModel, "google/gemma-4-31b-it:free");
  assert.equal(decodeAiConfiguration(JSON.stringify(value)).settings.openrouterModel, "google/gemma-4-31b-it:free");
});
for (const model of [
  "anthropic/claude-sonnet-4.5",
  "google/gemma-4-31b-it",
  "openrouter/auto",
  "google/gemma-4-31b-it:free:nitro",
]) {
  test(`reject paid/automatic selection ${model} before contacting any provider`, async () => {
    const value = freeInput();
    value.settings.openrouterModel = model;
    assert.throws(() => validateInput(value), /free models only/i);
    let calls = 0;
    await assert.rejects(
      runRecognition(value, (async () => {
        calls++;
        return providerResponse();
      }) as typeof fetch),
      /free models only/i,
    );
    assert.equal(calls, 0);
  });
}
test("free requests cap provider token and per-request prices at zero", async () => {
  const value = freeInput();
  value.operation = "recognizeMath";
  value.image = "data:image/png;base64,AAAA";
  await runRecognition(value, (async (_url, options) => {
    const body = JSON.parse(options!.body as string);
    assert.equal(body.model, "openrouter/free");
    assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0, request: 0 });
    assert.equal(body.messages[0].content[1].type, "image_url");
    assert.equal(body.models, undefined);
    return providerResponse();
  }) as typeof fetch);
});
test("authenticated relay rejects paid fallback configurations without provider requests", async () => {
  const value = freeInput();
  value.operation = "recognizeMath";
  value.image = "data:image/png;base64,AAAA";
  value.credentials.gemini = "fixture-gemini";
  value.settings.openrouterModel = "anthropic/claude-sonnet-4.5";
  let calls = 0;
  const response = await handleRecognitionRequest(
    new Request("https://relay.example.test", {
      method: "POST",
      headers: { Authorization: "Bearer fixture" },
      body: JSON.stringify(value),
    }),
    async () => true,
    (async () => {
      calls++;
      return providerResponse();
    }) as typeof fetch,
  );
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /free models only/i);
  assert.equal(calls, 0);
});
