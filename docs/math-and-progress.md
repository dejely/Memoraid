# Math, handwriting, and study progress

## Setup

Install dependencies with `npm ci`. The postinstall step builds the self-contained math surface from MathLive, its static styles, and its bundled fonts. `npm run math:build` regenerates it after changes; the generated file is ignored by Git. Math entry and rendering do not request CDN assets.

Apply both SQL migrations to the same Supabase project used by the frontend, in timestamp order. The new migration adds grading fields, private review events, and the transactional `record_study_review` RPC. Existing cards default to guided self-review. Native SQLite upgrades automatically to version 3 without resetting the library.

Deploy the recognition function after linking the intended Supabase project:

```sh
npx supabase db push
npx supabase functions deploy study-ai
```

Review the linked project and migration list before running these commands. The function uses the standard `SUPABASE_URL` and `SUPABASE_ANON_KEY` provided by Supabase. It verifies the bearer token with Auth before processing any operation. UniMERNet settings belong in the Edge Function's server-side environment. With newer Supabase publishable-key configurations, gateway JWT validation may reject tokens before the function executes; if needed deploy with `--no-verify-jwt`, retaining the explicit `auth.getUser(token)` validation in the function. Never remove that validation.

Build/deploy the web frontend after applying the migration. New web card queries and progress writes require the new schema. Rebuild the native app to include WebView and landscape support; an OTA update alone does not install native dependencies.

## Handwriting recognition setup

[Run the UniMERNet CPU service](../services/unimernet/README.md) and set
`UNIMERNET_URL` and `UNIMERNET_TOKEN` in the Edge Function's environment before
deploying `study-ai`. The relay authenticates the user, sends just the PNG to
UniMERNet, and gives the request 12 seconds. UniMERNet uses an app-level token
and requires no personal key.

In **Settings → Recognition**, optionally save a personal OpenRouter key and
enable free fallback. Use `openrouter/free` or an image-capable model ID ending
in `:free`. **Test connection** tests the current OpenRouter fields. Previously
saved paid model IDs switch to the free router when loaded. A saved Gemini key
can be removed from Settings.

If UniMERNet is unavailable, times out, or returns an unusable transcription,
the relay can make one OpenRouter attempt with a 20-second deadline and zero
price caps. The attempt requires both an enabled fallback and a key. Invalid
input, expired app authentication, and cancellation stop the request. The
browser and native app keep a 45-second overall deadline.

Personal keys stay in the current browser tab's session or in account-scoped
SecureStore on mobile. The relay receives the OpenRouter key transiently when
fallback is enabled. Recognition services receive the drawing for transcription
and return LaTeX for the existing editable preview.

## Studying math

Use **Text**, **Math**, or **Handwrite** for written questions. The math editor includes Basic, Statistics, and Probability layouts. Save mixed prose and equations with `\(inline math\)` or `\[block math\]`. Existing plain text stays plain text. The same display supports cards, tests, and saved-answer review in History.

The handwriting canvas supports stylus input, mouse/finger input, undo, stroke erasure, and clear. Pen-only mode ignores finger/palm contacts when the browser reports a pen pointer. Write one expression, tap **Recognize**, correct the preview, and tap **Use this equation** before submitting. Recognition receives only the drawing and a transcription instruction, never the expected answer. Drawing changes invalidate pending recognition. Raw ink is not saved in the library or uploaded to permanent storage.

Choose a written grading rule when editing a card:

- **Self-review:** reveal the expected answer and mark your result.
- **Numeric:** compare finite real values using the configured absolute tolerance (default 0.001).
- **Expression:** compare supported scalar expressions as identities.

Unsupported relations, collections, complex numeric answers, parse failures, and undetermined comparisons fall back to self-review. Select self-review when the prompt requires a particular formula form. Automatic/self-reviewed provenance is saved with each answer and visible in History.

## Rewards

Progress starts with reviews completed after this upgrade; old scores are not converted into new rewards.

The first review of a card each study day earns 10 XP, plus 5 XP if correct/easy. Later reviews of the same card that day earn no additional card XP. Each daily quest awards 25 XP once: review 10 distinct cards, review 5 cards that were due, and correctly retry 3 previously weak cards. Weak means the immediately preceding result was hard/incorrect. Reviews and scheduling commit atomically; retrying the same event ID does not schedule or reward it again.

Levels start at 1 and increase every 250 XP. Five distinct reviewed cards qualify a streak day; an unfinished current day keeps yesterday’s streak visible until midnight. No grace days are included in this release. Each event preserves its assigned study date and IANA timezone, including after travel. Web dates are assigned by the server in the submitted timezone; native dates use the device clock. Progress is personal, without competitive score verification.

Topic mastery uses deck tags. Each card contributes the average of its most recent three daily results; the last result on each day is used. Correct/easy is 1 and hard/incorrect is 0; unreviewed cards contribute 0. Topics containing self-reviewed results are labeled. This is practice progress, not a standardized assessment.

Native and web libraries remain separate. The explicit native upload includes grading metadata and review events, and has a versioned completion marker so older uploads can receive the new fields once. It is not continuous synchronization. Earned XP remains after deleting a set; topic mastery uses only current cards.

## Verification

```sh
npm test
npm run typecheck
npm run web:build
npx expo export --platform android --output-dir /tmp/memoraid-android-export
```

The SQLite migration test uses Python 3's standard sqlite3 module. `tests/progress-database.sql` checks RPC idempotency, quest eligibility, default grading, rollback, and owner isolation against an isolated Postgres database after both migrations; it inserts fixture users and must never run in production.

Before release, test a signed-in web browser and native tablet: save/delete/test keys, inspect equation rendering, draw with the real stylus, check palm interference, rotate the device, try offline math entry, submit and review answers, retry failed saves, and check rewards across midnight. Mocked tests do not prove provider accuracy or hardware behavior. Live recognition tests require the user's keys and provider credit. Review sanitized provider status and request duration without recording keys, handwriting, prompts, or answers.
