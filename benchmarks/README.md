# Recognition evaluation

The synthetic equation smoke test verifies the recognition path. Measure accuracy and latency separately with real stylus input.

## Cloud recognition

Collect consented held-out stylus drawings and label them independently before recognition. Keep reports free of keys, tokens, raw ink and identifying data. Compare UniMERNet Tiny and the free OpenRouter fallback using the same samples. Record the actual returned model. The recognizers receive the cropped PNG, and labels stay local to the benchmark.

Write JSONL records with `sampleId`, `truth`, `prediction`, `durationMs`, `failed`, `provider`, `model`. Duration is observed end-to-end preview time; the UI separately reports preparation, auth, upstream and preview-ready timings. Summarize locally:

```sh
npm run benchmark:recognition -- /path/to/records.jsonl
```

Failures count against accuracy; successful-request p50/p95 latency is reported separately. Compare models on the same samples and separate warm-up. Change defaults only with >=95% normalized exact accuracy and faster median latency. A connection test establishes key access, not vision accuracy or speed.

## Local isolated-symbol experiment

Settings → Experimental local recognition lab collects labeled individual symbols into separate training and held-out splits. The recognizer trains only on the training split. Samples stay in the account's local database; sharing is an explicit raw-ink export.

Collect >=100 fresh held-out real stylus drawings across supported symbols. Run on Chromium with a tablet/stylus and on a physical Android tablet. The hardware checkbox is an attestation, not automatic verification. Measure additional memory against the same app with the model unloaded using Chromium memory tools and Android `adb shell dumpsys meminfo <package>`. Record device/OS/browser, cold/warm conditions, dataset revision, memory method and model size. The model budget includes serialized templates; the algorithm is bundled with the app and downloads no neural model.

Export using “Share local dataset and reports.” Desktop diagnostics:

```sh
npx tsx scripts/local-recognition-benchmark.ts /path/to/dataset.json
```

Promotion requires both device reports, >=100 disjoint real held-out samples, >=95% accuracy, warm p95 <=1000ms, model <=25MB, measured additional memory <=150MB. Missing memory/device evidence fails. Review dataset provenance even if numerical gates pass. The lab does not promote production recognition or claim full-equation offline support. Issue #16 remains open for real evaluation.

For a relay benchmark, prepare a JSON corpus of `{ "id": "unique", "truth": "LaTeX label", "imagePath": "cropped.png" }` entries and a separate model list for each provider. Use `{ "provider": "unimernet", "model": "unimernet-tiny" }` with the configured relay. Use `{ "provider": "openrouter", "model": "openrouter/free" }` or explicit free model IDs with an isolated relay that has no UniMERNet endpoint configured. Supply `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `MEMORAID_ACCESS_TOKEN` through the environment. For OpenRouter, also supply `MEMORAID_OPENROUTER_KEY`. OpenRouter benchmark calls consume free quota.

```sh
npx tsx scripts/run-cloud-benchmark.ts corpus.json models.json report.jsonl
```

The runner records relay round-trip latency and preserves failures in the report. Capture UI preview time separately.
