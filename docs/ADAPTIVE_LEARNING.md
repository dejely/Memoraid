# Adaptive learning rollout

[PRD](../issues/prd.md) · [TRD](../issues/trd.md) · [prioritized issues](../issues/README.md)

Practice is in the web and app tab bar. It supports written cards (due first), generated core statistics, confirmed equations, saved drafts and a mistake notebook. Graded attempts save answers, local ink and review events atomically. Recognizing, editing and notebook corrections award no XP. Unknown diagnoses remain self-review. Numeric tolerance is ±0.001.

Scheduling uses pinned ts-fsrs 5.4.2 without fuzzing. Existing due dates initialize missing FSRS state without invented reviews. New events replay in timestamp/ID order; old events still contribute rewards. Web static equations use markup without editor frames; native paragraphs use a grouped read-only surface.

## Backend

Existing installations run only `supabase/migrations/20261117000000_adaptive_learning.sql` after the original schema and math/progress migrations. Do not rerun the create-tables script or reset production. The new migration adds entities, operation receipts, a cursor and authenticated owner-scoped RPCs, preserving old tables. It and the timed relay were applied to the linked project on 2026-11-17.

First sync imports the account's previous cloud library, preserves IDs/dates/snapshots and writes a migration marker. Upgrade clients together: older builds continue using the previous tables. The older shared native SQLite library requires explicit adoption in Settings and is never silently assigned to an account.

## Offline and sync

Per-account SQLite and Dexie IndexedDB isolate study data. The production web build generates a service worker for static assets only. Load once online and wait for installation before relying on offline refresh. API responses and credentials are excluded. Previously signed-in users can restore downloaded data offline; signing out closes the library. Clearing browser storage removes downloads.

Mutations and stable outbox operations commit together. Sync runs on sign-in, reconnect/resume, periodically while open and via Settings. Failed requests stay pending. The backend checks account identity, rejects stale entity versions and retains deletion tombstones. Review events are immutable. Conflicts keep device and cloud versions in Settings until explicit resolution. Edits made during an in-flight push stay pending. Missing migrations leave local study available with an actionable Settings message.

Handwriting stays local by default. Settings can upload existing/future strokes, stop uploads or delete cloud copies while retaining local replay. Deletion also scrubs raw ink from operation receipts and can be queued while offline. Local symbol training samples never sync. Keys remain in secure/session storage outside study entities and outbox operations.

Progress uses an incremental local projection with an explicit rebuild control. Minute-based full cloud review scans are removed.

## Verification boundaries

Node tests cover generation/grading, FSRS replay, account isolation, IndexedDB atomicity, deduplication/cancellation, outbox retry/conflict behavior, ink privacy and projections. `tests/sync-database.sql` checks owner isolation, receipts, immutable events, tombstones and cursor pagination in PostgreSQL. Web/Android exports establish bundling. Browser fixtures establish UI behavior; they do not establish live model accuracy or physical stylus usability. See [benchmarks](../benchmarks/README.md) for pending device evaluation.

The recorded checks and their limits are in [validation notes](ADAPTIVE_VALIDATION.md).
