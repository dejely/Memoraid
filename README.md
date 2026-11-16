# Memoraid

Memoraid is a Quizlet-style study app built with Expo for Android, iOS, and the web. Native and web clients use account-scoped local libraries (SQLite and IndexedDB) and synchronize private study data through Supabase. The web deploys as a static Expo Router app on Vercel.

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind
- Zustand
- TanStack Query
- expo-sqlite
- Supabase Auth and Postgres
- expo-secure-store
- expo-document-picker
- expo-file-system
- react-native-webview
- MathLive and CortexJS Compute Engine

## Features

- Create, edit, and delete study sets with title, description, tags, and cards.
- Light, dark, and system theme support with a persisted preference.
- Flashcard mode with tap-to-flip, swipe or button navigation, shuffle, easy/hard review marking, progress, and session resume.
- Test mode with multiple choice, true/false, and written response questions.
- Auto-grading for objective questions and guided self-review for written responses.
- Math entry with statistics/probability keyboards and equation rendering across study views.
- Stylus handwriting transcription with user-provided Gemini/OpenRouter keys and provider fallback.
- Numeric/expression grading with guided self-review for unsupported answers.
- Daily quests, XP, levels, streaks, and topic practice progress.
- Settings with account-scoped on-device credentials.
- Notes import from pasted text or picked text files.
- Local dashboard with all sets, recent activity, due cards, and saved test scores.

## Project Structure

```text
app/
  (tabs)/
    index.tsx
    import.tsx
    history.tsx
  sets/
    new.tsx
    [setId]/
      index.tsx
      edit.tsx
      study.tsx
      test.tsx
  _layout.tsx
src/
  components/
  db/
    client.ts
    schema.ts
    seed.ts
    repositories/
  features/
    dashboard/
    import/
    sets/
    study/
    tests/
  hooks/
  screens/
  services/
    ai/
    import/
    secure/
    sync/
  store/
  types/
  utils/
```

## Data Model

SQLite tables created on boot:

- `decks`
- `cards`
- `sessions`
- `test_attempts`
- `test_questions`
- `review_stats`
- `review_events`

Shared repositories and account-scoped platform stores live in [`src/db/local`](src/db/local). The earlier native database remains available for explicit adoption. Supabase synchronization uses the additive migrations in [`supabase/migrations`](supabase/migrations).

## Future-Ready Layers

- AI generation interface: [`src/services/ai/types.ts`](src/services/ai/types.ts)
- Local parser orchestration: [`src/services/import/study-import-service.ts`](src/services/import/study-import-service.ts)
- Platform-specific SQLite and Supabase repositories: [`src/db/repositories`](src/db/repositories)
- Secure backend/app config storage: [`src/services/secure/preferences-service.ts`](src/services/secure/preferences-service.ts)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project and apply the migration in [`supabase/migrations`](supabase/migrations).

3. Copy `.env.example` to `.env.local` and add the project's public URL and anon or publishable key. Never use a `service_role` key in an `EXPO_PUBLIC_` variable.

4. Start Expo:

   ```bash
   npm start
   ```

5. Open the project in Expo Go, or press `w` for the browser build. Sign in through the email magic link.

## Useful Scripts

```bash
npm start
npm run android
npm run ios
npm run web
npm run web:build
npm run typecheck
npm run apk:release
npm run aab:release
npm run apk:local
npm run aab:local
```

## Android Release Builds

For an installable release APK:

```bash
npx eas login
npx eas-cli init
npm run apk:release
```

For a Play Store style release bundle:

```bash
npm run aab:release
```

For the same builds on your own machine instead of EAS cloud:

```bash
npx eas login
npx eas-cli init
npm run apk:local
# or
npm run aab:local
```

Notes:

- Run `npx eas-cli init` once before your first EAS build. It will create or link the Expo project and write a fresh `extra.eas.projectId` into `app.json`.
- The current Android application id is `com.dejel.memoraid` in `app.json`. Change it before your first public release if you want a different package id.
- Local EAS builds require your own Android toolchain on this machine, including Android SDK/NDK and Java.
- Add the release app's `memoraid:///sign-in` callback (and the development callback printed by Expo) to Supabase Authentication redirect URLs before testing native magic links.

## Web Deployment

Previously signed-in users can practice downloaded content offline. Web uses IndexedDB and a production service worker for static assets; native uses account-scoped SQLite. Supabase sync uses owner-scoped versioned operations, cursor pulls, idempotent review events and explicit conflict resolution. Native users can explicitly adopt their older shared device library in Settings. See [adaptive learning setup and rollout](docs/ADAPTIVE_LEARNING.md).

The linked Vercel project is available at [memoraid-three.vercel.app](https://memoraid-three.vercel.app). It requires the two public Supabase environment variables and the included database migration before sign-in is enabled.

Build the static site with:

```bash
npm run web:build
```

Vercel configuration, environment variables, Supabase magic-link redirects, preview behavior, and smoke checks are documented in [`docs/web-deployment.md`](docs/web-deployment.md). The same `dist/` frontend can later be embedded in Tauri while continuing to use Supabase.

## GitHub Release APK Workflow

Publishing a GitHub Release now triggers [`.github/workflows/release-apk.yml`](.github/workflows/release-apk.yml), which builds a signed Android APK directly on the GitHub Actions runner using Expo prebuild plus Gradle. It does not use EAS cloud build queues.

Before the workflow can succeed:

1. Create an Android release keystore.
2. Add these GitHub repository secrets:
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

The workflow uploads the APK as a GitHub Actions artifact and, on published releases, attaches it to the GitHub Release. It also supports manual runs from the GitHub Actions tab via `workflow_dispatch`.

## Notes Import Format

Supported local parser formats include:

```text
term: definition
term - definition
term::definition
term<TAB>definition
Example: optional example for the previous card
```

## Math, Handwriting, and Progress

Setup, credential storage, recognition deployment, grading rules, and rewards are documented in [docs/math-and-progress.md](docs/math-and-progress.md). Apply the new Supabase migration and deploy `study-ai` before enabling handwriting recognition on the web. Native apps require a rebuild for WebView support.

## Verification

```bash
npm test
npm run typecheck
npm run web:build
```

The browser export resolves `.web.ts` repository, database-bootstrap, preference, and file-reader implementations, so native-only SQLite and filesystem code are not included in the web bundle.

### Practice and recognition performance

Open the Practice tab for written cards, generated core statistics, and the mistake notebook. Draft answers and timestamped strokes save locally; handwriting upload is opt-in in Settings. API keys stay in their separate secure/session storage. The local-symbol lab stays experimental until real-device benchmark gates pass. See [recognition evaluation](benchmarks/README.md) and the [prioritized roadmap](issues/README.md).
