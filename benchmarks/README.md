# Recognition evaluation

No real handwriting accuracy or device latency result is claimed. Provider defaults and deadlines are unchanged.

## Cloud recognition

Collect consented held-out stylus drawings. Label samples independently before recognition. Do not commit keys, tokens, raw ink or identifying data in reports. Configure your own keys in Settings and compare explicit free vision-capable OpenRouter models with `openrouter/free`, recording the actual returned model. The relay receives only the cropped PNG, never the expected answer.

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

For an actual relay benchmark, prepare a JSON corpus of `{ "id": "unique", "truth": "LaTeX label", "imagePath": "cropped.png" }` and a model matrix of `{ "provider": "openrouter", "model": "openrouter/free" }` entries. Supply `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `MEMORAID_ACCESS_TOKEN` and your `MEMORAID_OPENROUTER_KEY` / `MEMORAID_GEMINI_KEY` through your environment, never command arguments or committed files. Running this command makes provider calls and may consume quota (or incur Gemini charges):

```sh
npx tsx scripts/run-cloud-benchmark.ts corpus.json models.json report.jsonl
```

This runner records relay round-trip latency, not UI preview latency. Capture the UI stage timings separately. It runs samples serially, preserves failures in the report, allows only free OpenRouter IDs, and sends neither labels nor expected answers to the relay.
