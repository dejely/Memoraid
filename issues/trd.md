# Memoraid adaptive learning TRD

## Architecture

Expo clients share a TypeScript domain. Platform adapters store versioned entities in per-account SQLite (native) or Dexie 4.4.7 IndexedDB (web). Repositories expose decks, sessions, attempts, ink and immutable review events. A unit of work commits each answer and its outbox operations together. Supabase owns authentication and an additive synchronization protocol; recognition is a separate authenticated relay.

## Recognition contract

Input: PNG cropped from padded stroke bounds, preprocessing version, request ID, own provider configuration and cancellation signal. Ink points include x/y/t and optional pressure and dimensions. Expected answers are excluded. Output: editable LaTeX, unreadable flag, actual provider/model, request ID and relay auth/upstream timings. Client measures preparation, network and preview-ready time. Cache keys include account, image, preprocessing version and model configuration; credentials never enter cache keys or telemetry. A bounded memory cache and pending request subscribers deduplicate unchanged ink, while each subscriber may cancel; abort upstream only when no subscribers remain. Keep existing 20s provider / 45s outer timeouts.

Use actual completed stages for status. Benchmark JSONL records have sample ID, normalized truth/prediction, provider/model, duration and failure; the summary reports p50/p95, accuracy and failure rate. The default does not change based on synthetic fixtures.

## Rendering and Practice

Web static math uses sanitized generated math markup and bundled styles/fonts without an iframe/editor per equation. Native read-only math groups paragraphs into one surface. Drawing accepts initial ink, reports stroke snapshots on changes, crops with padding on recognition, and replays saved time-stamped points. Practice supports written deck cards and seeded core-statistics templates. Confirmation precedes deterministic grading or explicit self-review. Attempts retain input, confirmed answer, correction, provenance, concept and optional ink reference. Diagnoses require confirmed diagnostic evidence; unknown stays self-review.

## Scheduling and progress

Use pinned ts-fsrs 5.4.2. Map incorrect/correct/hard/easy to Again/Good/Hard/Easy. Initialize a missing FSRS card at its previous due date; do not fabricate previous reviews or reschedule at migration. Sort review events by happenedAt then ID, deduplicate IDs and replay. Graded attempts alone emit review events. Daily reward projections preserve the current XP/quests/streak rules and update locally; projection rebuild is available. Cloud pulls only changed entities using a cursor.

## Local data and isolation

Entities have kind, ID, JSON payload, server version and deletion state. Outbox operations have stable ID, entity key, base version and mutation. Commit mutations plus outbox atomically; incoming conflicts are stored separately, never silently discarded. Keys are kept outside all study stores. Each account opens its own database; signed-out state cannot read it. Persist draft and ink before navigation. An older shared native library can be read only for an explicit account-adoption action.

## Synchronization API

Add owner-scoped entities and applied-operation receipts. RPC push validates auth.uid, allowed kinds, payload size and optimistic base version. A repeated operation returns its original outcome. Concurrent entity edits return current remote state for explicit resolution. Immutable review-event insertion deduplicates event IDs; events cannot be overwritten. Each successful mutation or deletion gets a monotonic server cursor. Pull obtains the same per-account transaction lock as push to avoid crossing an uncommitted cursor. Return bounded pages and a high-water cursor. RLS restricts all reads to auth.uid. Tombstones are retained so older clients cannot resurrect deleted records. Clients pull, push serially, then pull again; leave failures in outbox. Conflicts can retain remote or publish the local version based on the newest remote revision.

Bootstrap imports existing owner-scoped Supabase decks/cards/sessions/tests/reviews when no migration marker exists, preserving IDs and dates. Old cloud tables remain untouched. Missing new RPCs disable sync with an actionable settings message while local study continues. Deploy additive schema first, verify ownership/idempotency/reconnect in a disposable database, then enable the client. Do not reset production data.

## Handwriting controls

Raw ink is a separate local entity. Default outbox excludes ink. Explicit opt-in queues existing ink; disabling stops uploads. A separate cloud deletion action publishes ink tombstones while retaining local strokes. Answers and review metadata continue syncing. Draft ink follows the same rule.

## Experimental recognition

Provide a small symbol recognizer prototype trained only from an explicit training split and a browser/device benchmark harness. Keep train and held-out sample IDs disjoint. Require at least 100 real stylus held-out samples, >=95% normalized exact accuracy, warm p95 <=1s on Chromium and physical Android, <=25MB download and <=150MB additional memory. No automatic promotion without a saved passing report. Cloud/manual input remains available. This experiment does not claim full equation recognition.

## Rollout and verification

1. Specifications and twelve linked issues before feature code.
2. P0 timing, crop/cache, rendering and Practice.
3. P1 notebook, deterministic statistics, FSRS.
4. P2 local stores, additive backend, reconnect/conflict tests, privacy and projections.
5. P3 prototype and report; physical evaluation remains open until evidence exists.

Use Node behavioral tests, SQL integration checks, web production export, Android export and Chromium interaction checks. Capture real model/device evidence separately; never equate mocks with accuracy. Keep PR descriptions short and commits scoped by concern.

## References

- [GitHub native issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies)
- [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction())
- [ts-fsrs source and pinned v5 API](https://github.com/open-spaced-repetition/ts-fsrs/tree/v5.4.2)
