# Crop ink, cache results and deduplicate recognition

Priority: P0 · Type: AFK

## Parent PRD

[PRD](prd.md) · [TRD](trd.md) · FR2

## What to build

Crop padded ink bounds and add bounded account/version-scoped result caching with pending deduplication and subscriber cancellation.

## Acceptance criteria

- [ ] Preserve superscripts and fractions within padded bounds.
- [ ] Repeated unchanged ink reuses results without another provider call.
- [ ] New ink and cancellation cannot apply stale answers.

## Blocked by

- [issues/001-recognition-benchmarks.md](001-recognition-benchmarks.md)

## User stories addressed

2, 6, 17
