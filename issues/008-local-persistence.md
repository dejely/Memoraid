# Persist and resume account-scoped offline study

Priority: P2 · Type: AFK

## Parent PRD

[PRD](prd.md) · [TRD](trd.md) · FR8

## What to build

Unify account-scoped SQLite and IndexedDB repositories, atomic attempt/outbox writes and explicit legacy adoption.

## Acceptance criteria

- [ ] Reopen downloaded decks and drafts offline for a signed-in account.
- [ ] Accounts cannot read each other's local study data.
- [ ] A failed transaction leaves neither a partial attempt nor a partial outbox.

## Blocked by

- [issues/004-practice.md](004-practice.md)

## User stories addressed

5, 11, 18
