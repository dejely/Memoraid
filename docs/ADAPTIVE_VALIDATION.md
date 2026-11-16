# Adaptive learning validation — 2026-11-17

- Node behavioral suite: 49 passed.
- TypeScript check passed.
- Web production export passed; offline shell includes 41 static assets.
- Android Hermes export passed. Physical Android/iOS UI behavior remains unverified.
- All three migrations applied in an isolated PostgreSQL instance. `tests/sync-database.sql` passed owner isolation, idempotent receipts, immutable events, optimistic conflicts, pagination, tombstones and ink receipt scrubbing.
- Additive sync migration applied to the linked Supabase project. Verified RLS enabled, authenticated RPC access allowed and anonymous RPC access denied. No existing library tables were reset.
- Latest authenticated recognition relay deployed with actual model IDs, request correlation and stage timing. Live calls with a user's AI key were not made.
- Chromium fixture checks: Practice discovery, generated question, typed draft across reload, simulated drawing → mocked transcription → editable confirmation → automatic incorrect result, notebook correction persistence, and saved ink display. Static notebook equations render without editor frames. The mock response is not accuracy evidence.
- Clean Chromium context: service worker controlled navigation returned HTTP 200 online and offline; a Practice draft value `123` restored after offline navigation. Initial redirect-response failure was reproduced and fixed, with a Node regression test.

No cloud model default was changed and no local recognizer was promoted. Issue #16 remains open for at least 100 real held-out stylus samples, Chromium and physical Android evaluation, accuracy/latency thresholds and measured memory. See [benchmark procedure](../benchmarks/README.md).
