# Prototype and benchmark experimental local symbols

Priority: P3 · Type: HITL

## Parent PRD

[PRD](prd.md) · [TRD](trd.md) · FR12

## What to build

Implement an opt-in local-symbol prototype and benchmark gate; require real stylus labels and physical Android testing before promotion.

## Acceptance criteria

- [ ] Separate training and at least 100 held-out real stylus samples.
- [ ] Gate >=95% accuracy, warm p95 <=1s on Chromium and physical Android, model <=25MB, extra memory <=150MB.
- [ ] Without passing evidence keep experimental and retain cloud/manual fallback.

## Blocked by

- [issues/001-recognition-benchmarks.md](001-recognition-benchmarks.md)
- [issues/004-practice.md](004-practice.md)

## User stories addressed

16
