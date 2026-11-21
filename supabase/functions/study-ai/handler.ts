import { RelayError, runRecognition, validateInput, type UniMerNetConfig } from "./recognition.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
export async function handleRecognitionRequest(
  request: Request,
  authenticate: (token: string) => Promise<boolean>,
  fetcher: typeof fetch = fetch,
  report?: Parameters<typeof runRecognition>[3],
  unimernet?: UniMerNetConfig,
) {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  try {
    const authStarted = Date.now();
    const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "");
    if (!token) return json({ error: "Sign in before using recognition." }, 401);
    if (!(await authenticate(token))) return json({ error: "Your session expired. Sign in again." }, 401);
    const authMs = Date.now() - authStarted;
    // Read incrementally: never buffer an unbounded user-controlled request.
    const reader = request.body?.getReader();
    if (!reader) throw new RelayError("Empty request.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 2_100_000) {
        await reader.cancel();
        return json({ error: "Drawing too large." }, 413);
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let raw;
    try {
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new RelayError("Invalid JSON.");
    }
    const requestId = typeof raw?.requestId === "string" && /^[a-zA-Z0-9:_-]{1,80}$/.test(raw.requestId) ? raw.requestId : crypto.randomUUID();
    const upstreamStarted = Date.now();
    const result = await runRecognition(validateInput(raw), fetcher, request.signal, metric => report?.({ ...metric, requestId }), unimernet);
    return json({ ...result, requestId, timings: { authMs, upstreamMs: Date.now() - upstreamStarted } });
  } catch (error) {
    // Never echo provider response bodies or request details containing credentials/ink.
    return json(
      { error: error instanceof RelayError ? error.message : "Recognition service is unavailable." },
      error instanceof RelayError ? error.status : 500,
    );
  }
}
