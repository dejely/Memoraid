# Synchronize offline edits with explicit conflicts

Priority: P2 · Type: AFK

## Parent PRD

[PRD](prd.md) · [TRD](trd.md) · FR9

## What to build

Add owner-scoped versioned operations, receipts, cursor pulls and tombstones with reconnect/conflict UI.

## Acceptance criteria

- [ ] Retries and repeated review events are idempotent.
- [ ] Concurrent edits retain both versions until user resolution.
- [ ] Deletion propagates and missing migrations leave local study available.

## Blocked by

- [issues/008-local-persistence.md](008-local-persistence.md)

## User stories addressed

12, 13
