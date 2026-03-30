# Memoraid

Memoraid is a personal-use Quizlet-style study app built with a mobile-first Expo stack. It runs locally in Expo Go for the first version, persists data with `expo-sqlite`, and keeps AI plus cloud sync behind service interfaces instead of hardcoding them into the client.

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- NativeWind
- Zustand
- TanStack Query
- expo-sqlite
- expo-secure-store
- expo-document-picker
- expo-file-system

## Features

- Create, edit, and delete study sets with title, description, tags, and cards.
- Light, dark, and system theme support with a persisted preference.
- Flashcard mode with tap-to-flip, swipe or button navigation, shuffle, easy/hard review marking, progress, and session resume.
- Test mode with multiple choice, true/false, and written response questions.
- Auto-grading for objective questions and guided self-review for written responses.
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

The database is initialized in [`src/db/client.ts`](src/db/client.ts) and schema versioned in [`src/db/schema.ts`](src/db/schema.ts).

## Future-Ready Layers

- AI generation interface: [`src/services/ai/types.ts`](src/db/client.ts)
- Local parser orchestration: [`src/services/import/study-import-service.ts`](src/services/import/study-import-service.ts)
- Sync abstraction for later Supabase work: [`src/services/sync/types.ts`](src/services/sync/types.ts)
- Secure backend/app config storage: [`src/services/secure/preferences-service.ts`](src/services/secure/preferences-service.ts)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start Expo:

   ```bash
   npm start
   ```

3. Open the project in Expo Go on iOS or Android.

## Useful Scripts

```bash
npm start
npm run android
npm run ios
npm run web
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

## Verification

- `npm run typecheck`

Native-first verification is the target for this version. A web export was attempted, but the installed `expo-sqlite` package in this SDK currently fails web bundling in this workspace because of a missing wasm asset. Expo Go and native flows remain the intended first-release path.
