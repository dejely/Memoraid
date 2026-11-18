# Study workspace redesign

[Desktop and mobile wireframe](./ui-wireframe.svg)

The dashboard puts the next study session first, followed by a searchable library. A desktop sidebar becomes bottom navigation below 1024 px. At 1200 px, daily goals sit beside the library; smaller screens use one column. Content is capped at 1180 px for readable spacing on large monitors.

## Screen changes

- **Overview:** a real recommended set, total due count, recent test average, title/description/tag search, due-only filter, deck grid, daily goals and a compact activity timeline. Full test history stays in History.
- **Practice:** problem sources beside the answer workspace on desktop. On phones, an active answer appears before the source picker. Text, math and handwriting modes, grading, draft saving and the mistake notebook retain their existing behavior.
- **Settings:** Appearance, Recognition, Data & sync, and Advanced sections. Theme previews show both modes. API form edits survive section changes; account sign-out is under Data & sync.
- **Import:** file instructions and a grouped set form, followed by the existing preview/save flow.
- **Shared UI:** consistent borders, modest corner radii, responsive spacing, button feedback and accessible field labels. Set details also use semantic theme colors for their study actions.

## Theme references

The existing theme tokens are preserved. The tweakcn examples inform the bordered cards, simple control groups and use of accent color:

- [Pink dark](https://tweakcn.com/themes/cmr5kll1g000004jxcs7c0gl5)
- [Pink light](https://tweakcn.com/themes/cmqw831ct000004ld8s7g5t26)
- [Designbyte](https://tweakcn.com/themes/cmcup07dt000104l4hj4eferh)

Classic, Pink and Designbyte support Light, Dark and Use device. Theme settings remain local; this redesign needs no Supabase migration or new packages.

## Visual evidence

Screenshots use a synthetic account and sample decks, with Supabase responses intercepted in the test browser. Sample content is not shipped in the app.

[Pink light desktop](./pink-light-desktop.png) · [Designbyte dark desktop](./designbyte-dark-desktop.png) · [Designbyte dark mobile](./designbyte-dark-mobile.png) · [Handwriting on mobile](./handwriting-mobile.png)

## Verification

- 53 existing tests and TypeScript checks.
- Production web export and Android Hermes export.
- Chromium checks of all six palette/mode combinations, saved preference reload, device appearance changes, search/filter/reset, phone layout, Settings sections and import preview/save.
- Practice draft reload, handwritten strokes and the embedded math editor in the themed workspace.

Browser checks use 1440 px desktop, 390 px phone, and intermediate/short viewports. Native exports verify bundling, not physical tablet or stylus behavior. No real API keys, recognition providers, or production database writes are used in these checks.
