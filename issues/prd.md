# Memoraid adaptive learning PRD

## Problem Statement

Handwriting is difficult to discover, recognition latency is opaque, and static equations mount heavyweight editing surfaces. Practice does not retain ink or systematically turn mistakes into targeted learning. Web study depends on a connection and the older native library is not account-scoped.

## Solution

Deliver the roadmap in dependency order: measurable recognition and a dedicated Practice tab first; corrections, statistics generators and adaptive review next; account-scoped local persistence, reliable sync and progress projections after that. Keep local recognition experimental until its real-device accuracy and performance gate passes.

## User Stories

1. As a learner, I want to see recognition stages and measured timing, so I can understand a slow response.
2. As a learner, I want to recognize only the written area and reuse unchanged results, so I avoid repeated network work.
3. As a learner, I want to read equations without mounting an editor for each formula, so screens load quickly.
4. As a learner, I want to open a dedicated Practice tab and choose a deck or generated statistics problem, so handwriting is easy to find.
5. As a learner, I want to resume an unfinished answer including its strokes after reopening the application.
6. As a learner, I want to confirm or edit recognition before grading, so transcription errors do not become learning errors.
7. As a learner, I want to revisit wrong answers with their original answer, correction and stroke replay in a mistake notebook.
8. As a learner, I want to practice seeded mean, median, variance, standard deviation and z-score problems with deterministic grading.
9. As a learner, I want to review cards using FSRS and target concepts I struggle with, so practice adapts to my history.
10. As a learner, I want to earn rewards only for completed graded attempts, so recognition retries do not inflate progress.
11. As a learner, I want to study downloaded content offline after signing in, with each account isolated.
12. As a learner, I want to sync answers, review events and content reliably after reconnecting without duplicate reviews.
13. As a learner, I want to keep both versions of conflicting edits and explicitly choose which to retain.
14. As a learner, I want to keep handwriting on this device by default and explicitly control upload and cloud deletion.
15. As a learner, I want to load progress summaries incrementally and rebuild them from immutable review events.
16. As a learner, I want to evaluate experimental local recognition against real held-out handwriting before enabling it.
17. As a learner, I want to keep my own Gemini and free OpenRouter keys in Settings, outside study databases and exports.
18. As a learner, I want to adopt my older device library explicitly into the currently signed-in account.

## Functional requirements and priority

| Priority | Requirement | Acceptance |
| --- | --- | --- |
| P0 | FR1 recognition instrumentation | Request ID, preparation/auth/upstream/preview timings; no ink or secrets in logs. |
| P0 | FR2 recognition efficiency | Padded bounds, per-account versioned bounded cache, pending deduplication, cancellation, actual stage feedback. |
| P0 | FR3 static equations | Web static markup; native grouped read-only surface; active input retains editor. |
| P0 | FR4 Practice | Deck and generated modes, explicit recognize/confirm, saved strokes and draft resume. |
| P1 | FR5 mistake notebook | Original answer, confirmed answer, grading provenance, correction and stroke replay; unknown causes remain self-review. |
| P1 | FR6 statistics | Seeded core statistics, numeric tolerance and deterministic solutions; no answer sent to recognition. |
| P1 | FR7 adaptive review | FSRS Again/Good/Hard/Easy mappings; old due dates preserved; concept targeting; graded-only rewards. |
| P2 | FR8 local persistence | SQLite native, IndexedDB web; transactionally save attempts and pending operations; account isolation. |
| P2 | FR9 sync | Stable IDs, optimistic versions, cursor pull, tombstones, explicit conflict resolution and event replay. |
| P2 | FR10 handwriting privacy | Local by default; opt-in upload, disable and cloud-delete controls. |
| P2 | FR11 progress | Incremental local projections with deterministic rebuild from events; no minute-by-minute full cloud scans. |
| P3 | FR12 local recognition | Experimental prototype and benchmark runner; promote only after real-device gate. |

## Implementation Decisions

- Shared TypeScript domain and repositories with platform storage adapters; Supabase remains authentication and synchronization backend.
- User-provided keys remain in secure storage on native and session storage on web. OpenRouter accepts free models only. Existing provider timeouts remain until measured evidence supports changing them.
- Recognition receives ink/image and model/preprocessing versions, never an expected answer. Return editable transcription and actual selected model.
- Store points with x/y/time and optional pressure plus canvas dimensions. Persist answers independently of optional raw ink upload.
- Use ts-fsrs 5.4.2 with explicit versioned state. Missing legacy state begins at its existing due date without invented reviews.
- Sync immutable review events by ID and replay deterministically. Preserve conflicting content rather than silently overwriting it.
- Older native content requires explicit adoption into an account. No guest offline mode.

## Testing Decisions

Test public behavior using the existing Node test runner: cache isolation and cancellation, deterministic generators, FSRS replay, persistence atomicity, conflict/tombstone behavior, account isolation and reward idempotency. Use browser smoke checks for Practice and editor flows. Build Android to check bundling. Builds and synthetic fixtures do not establish physical stylus accuracy or native usability.

## Nonfunctional requirements

- NFR1: log metadata only, never credentials, images or expected answers.
- NFR2: preserve user data with additive migrations and explicit conflict resolution.
- NFR3: benchmark p50/p95, normalized exact accuracy and failure rate; no unsupported speed claims.
- NFR4: local promotion requires at least 100 held-out real stylus samples, accuracy >=95%, warm p95 <=1000ms on Chromium and physical Android target, model <=25MB and additional memory <=150MB.
- NFR5: cloud model default changes require >=95% accuracy and a faster median than the current default on the same dataset.

## Out of Scope

General template authoring, subjects outside core statistics, guaranteed complete offline equation recognition, paid OpenRouter models, guest accounts, automatic attribution of a misconception from an unconfirmed transcription.

## Further Notes

P3 is the only human-in-the-loop slice: real labeled ink and physical-device evaluation are required before promotion. Earlier slices do not depend on that gate. Source: approved roadmap and user decisions in this conversation, 2026-11-17.
