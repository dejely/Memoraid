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
- `sync_queue`
- `sync_state`

The database is initialized in [`src/db/client.ts`](/home/dejel/Documents/GitHub/Quiztography/src/db/client.ts) and schema versioned in [`src/db/schema.ts`](/home/dejel/Documents/GitHub/Quiztography/src/db/schema.ts).

## Future-Ready Layers

- AI generation interface: [`src/services/ai/types.ts`](/home/dejel/Documents/GitHub/Quiztography/src/services/ai/types.ts)
- Local parser orchestration: [`src/services/import/study-import-service.ts`](/home/dejel/Documents/GitHub/Quiztography/src/services/import/study-import-service.ts)
- Sync abstraction for later Supabase work: [`src/services/sync/types.ts`](/home/dejel/Documents/GitHub/Quiztography/src/services/sync/types.ts)
- Secure backend/app config storage: [`src/services/secure/preferences-service.ts`](/home/dejel/Documents/GitHub/Quiztography/src/services/secure/preferences-service.ts)

## Custom Sync API

The app now includes a local-first sync integration for user-provided backend APIs:

- Backend settings screen: [`src/screens/SyncSettingsScreen.tsx`](/home/dejel/Documents/GitHub/Quiztography/src/screens/SyncSettingsScreen.tsx)
- Sync hooks: [`src/features/sync/hooks.ts`](/home/dejel/Documents/GitHub/Quiztography/src/features/sync/hooks.ts)
- Sync queue and remote merge layer: [`src/db/repositories/sync-repository.ts`](/home/dejel/Documents/GitHub/Quiztography/src/db/repositories/sync-repository.ts)
- Custom API provider: [`src/services/sync/custom-api-sync-service.ts`](/home/dejel/Documents/GitHub/Quiztography/src/services/sync/custom-api-sync-service.ts)

Design notes:

- The client never connects directly to a raw database.
- Users provide a backend API base URL, not a Postgres/MySQL connection string.
- Local SQLite remains the source of truth on-device, with a queue of pending changes for deck snapshots and test attempts.
- Remote sync is designed around deck snapshots, deck deletes, and test attempt snapshots.

Expected backend endpoints:

- `GET /.well-known/memoraid-sync`
- `POST /v1/sync/push`
- `POST /v1/sync/pull`

The current client expects a discovery response like:

```json
{
  "service": "memoraid-sync",
  "version": "1.0.0",
  "capabilities": ["push", "pull"]
}
```

Push requests send queued changes in this general shape:

```json
{
  "cursor": "optional-server-cursor",
  "client": {
    "app": "Memoraid",
    "platform": "android"
  },
  "changes": [
    {
      "id": "deck:deck_123",
      "entityType": "deck",
      "entityId": "deck_123",
      "operation": "upsert",
      "payload": {}
    }
  ]
}
```

Pull responses should return:

```json
{
  "cursor": "next-server-cursor",
  "changes": {
    "decks": [],
    "deletedDeckIds": [],
    "testAttempts": []
  }
}
```

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
npm run backend:install
npm run backend:migrate
npm run backend:dev
npm run backend:typecheck
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

Publishing a GitHub Release now triggers [`.github/workflows/release-apk.yml`](/home/dejel/Documents/GitHub/Quiztography/.github/workflows/release-apk.yml), which builds a signed Android APK directly on the GitHub Actions runner using Expo prebuild plus Gradle. It does not use EAS cloud build queues.

Before the workflow can succeed:

1. Create an Android release keystore.
2. Add these GitHub repository secrets:
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

The workflow uploads the APK as a GitHub Actions artifact and, on published releases, attaches it to the GitHub Release. It also supports manual runs from the GitHub Actions tab via `workflow_dispatch`.

## Reference Sync Backend

A reference backend now lives in [`backend/package.json`](/home/dejel/Documents/GitHub/Quiztography/backend/package.json) and implements the same Memoraid sync contract the mobile app expects.

Stack:

- Node.js
- Express
- PostgreSQL
- Zod

Key files:

- Server entry: [`backend/src/index.ts`](/home/dejel/Documents/GitHub/Quiztography/backend/src/index.ts)
- Postgres migration: [`backend/migrations/001_init.sql`](/home/dejel/Documents/GitHub/Quiztography/backend/migrations/001_init.sql)
- Sync schemas: [`backend/src/sync/schemas.ts`](/home/dejel/Documents/GitHub/Quiztography/backend/src/sync/schemas.ts)
- Sync service: [`backend/src/sync/service.ts`](/home/dejel/Documents/GitHub/Quiztography/backend/src/sync/service.ts)
- Example env file: [`backend/.env.example`](/home/dejel/Documents/GitHub/Quiztography/backend/.env.example)

Local setup:

1. Create a PostgreSQL database.
2. Copy `backend/.env.example` to `backend/.env` and update `DATABASE_URL`.
3. Install backend dependencies:

   ```bash
   npm run backend:install
   ```

4. Run the database migration:

   ```bash
   npm run backend:migrate
   ```

5. Start the backend:

   ```bash
   npm run backend:dev
   ```

The backend exposes:

- `GET /health`
- `GET /.well-known/memoraid-sync`
- `POST /v1/sync/push`
- `POST /v1/sync/pull`

If `SYNC_ACCESS_TOKEN` is set, the mobile app should use the same value in Sync Settings as its bearer token.

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
