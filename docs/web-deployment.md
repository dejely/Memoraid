# Web deployment

Memoraid exports as a client-side Expo Router application and is served from
Vercel's static CDN. Supabase supplies authentication and online data; Vercel
does not host a separate application server for this deployment.

## Prerequisites

- A Supabase project with the repository's migrations applied and row-level
  security enabled.
- A Vercel account connected to the GitHub repository.
- The production branch set to `main` in Vercel.

## Environment variables

Copy `.env.example` to `.env.local` for local development and replace both
placeholders:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

In **Vercel > Project > Settings > Environment Variables**, add both variables
to the **Production** and **Preview** environments. Redeploy after changing a
value because Expo embeds `EXPO_PUBLIC_` variables in the generated browser
bundle at build time.

The anon or publishable key is intended for browser clients when row-level
security policies are active. Never place a Supabase `service_role` or secret
key in an `EXPO_PUBLIC_` variable, Git, or Vercel's client build environment.

## Supabase magic-link URLs

Open **Supabase Dashboard > Authentication > URL Configuration** and configure:

1. **Site URL**: the canonical production URL,
   `https://memoraid-three.vercel.app` (replace it if a custom domain is added).
2. **Redirect URLs**:

   ```text
   http://localhost:8081/**
   https://memoraid-three.vercel.app/
   https://*-azures-projects-9b98b1a0.vercel.app/**
   memoraid:///sign-in
   ```

The production hostname and account-scoped preview pattern above match the
currently linked Vercel project. The final pattern allows Vercel preview
deployments for that account while keeping the production entry exact. The
`memoraid` callback is used by installed native builds; while
testing in Expo Go, also add the development callback URL printed by Expo. If a
custom domain is added later, make it the Site URL and add its
exact sign-in return URL to the list.

The web client derives its magic-link return URL from the current browser
origin. This sends production links back to production and preview links back to
the preview that requested them. Keep the preview wildcard restricted to the
project's Vercel team/account suffix; do not use an unrestricted `https://**`
pattern.

If the Supabase email template was customized, make sure its confirmation link
honors the redirect value supplied by the client. Supabase's default magic-link
template already does this.

## Connect Vercel

1. In Vercel, choose **Add New > Project** and import the GitHub repository.
2. Keep the repository root as the **Root Directory** and select **Other** as the
   framework preset if Vercel does not select it automatically.
3. Add the two environment variables above for Production and Preview.
4. Deploy. The checked-in `vercel.json` runs `npm ci`, runs
   `npm run web:build`, and publishes `dist/`.

The configuration rewrites unknown paths to `index.html`, so Expo Router routes
continue to work when opened directly or refreshed. Generated Expo JavaScript
assets receive immutable caching; the application routes keep Vercel's normal
revalidation behavior. Baseline browser security headers deny framing, MIME
sniffing, camera, microphone, and geolocation access.

## Git deployment workflow

- A pull request or a push to a non-production branch creates a Vercel Preview
  deployment. Use its unique URL for review and magic-link testing.
- A merge or push to `main` creates a Production deployment at the configured
  production domain.
- Promote only code whose Preview deployment passed the checks below. Vercel
  deployments are immutable, so use the Vercel dashboard to roll back to a
  previous production deployment if necessary.

Preview and production currently use whichever Supabase projects their
respective Vercel environment variables select. To prevent test data from
mixing with production data, point Preview variables at a separate Supabase
project with the same migrations whenever one is available.

## Pre-deployment and smoke checks

Run locally before pushing:

```bash
npm ci
npm run typecheck
npm run web:build
```

Confirm that `dist/index.html` exists. Then verify the Vercel Preview:

- Open the home page, a nested route directly, and the same nested route after a
  browser refresh.
- Request and consume a magic link, sign out, and confirm an expired or reused
  link shows a recoverable sign-in state.
- Create, edit, study, test, and import data in one account; verify a second
  account cannot read it.
- Test with the network disabled or Supabase unreachable and confirm writes fail
  visibly instead of appearing to save offline.
- Check the browser console and network panel for bundle-loading or Supabase
  errors.

After the Preview passes, merge to `main` and repeat the direct-route,
authentication, and console checks on the production URL.

## Tauri compatibility

The same exported web UI can later be packaged as a Tauri frontend and continue
using Supabase; it does not require a new web backend. A Tauri build will need
its own permitted authentication return URL (custom scheme or localhost,
depending on the chosen Tauri auth flow). Native desktop SQLite should be added
as a separate data adapter only if offline-first desktop behavior becomes a
requirement.

## References

- [Expo web export and output modes](https://docs.expo.dev/guides/publishing-websites/)
- [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Supabase redirect URLs and Vercel preview patterns](https://supabase.com/docs/guides/auth/redirect-urls)
