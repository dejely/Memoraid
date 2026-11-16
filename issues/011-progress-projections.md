# Maintain incremental progress summaries

Priority: P2 · Type: AFK

## Parent PRD

[PRD](prd.md) · [TRD](trd.md) · FR11

## What to build

Replace minute-based full cloud scans with event-driven local progress projections and rebuild.

## Acceptance criteria

- [ ] New/merged review events update progress once.
- [ ] A rebuild equals incremental output.
- [ ] Progress reads do not download all cloud review events every minute.

## Blocked by

- [issues/009-offline-sync.md](009-offline-sync.md)

## User stories addressed

10, 15
