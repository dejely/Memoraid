# Measure recognition stages and add benchmark runner

Priority: P0 · Type: AFK

## Parent PRD

[PRD](prd.md) · [TRD](trd.md) · FR1

## What to build

Record request IDs and real preparation/auth/upstream/preview timings. Add reproducible latency/accuracy/failure reports without logging ink or keys.

## Acceptance criteria

- [ ] Report p50/p95, accuracy and failures from labeled records.
- [ ] Return actual provider/model and relay stage timings.
- [ ] Preserve current defaults and timeouts until evidence justifies a change.

## Blocked by

None - can start immediately.

## User stories addressed

1, 16
