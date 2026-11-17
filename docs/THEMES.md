# Appearance themes

Settings → Appearance offers Classic, Pink and Designbyte independently from Light, Dark or Use device mode. Existing light/dark/system preferences retain their meaning. New palette choices are saved on this device (localStorage on web, SecureStore on native); no Supabase migration or sync is involved.

## Reference palettes

- Pink light: [PastelPink](https://tweakcn.com/themes/cmqw831ct000004ld8s7g5t26), using the reference's light tokens.
- Pink dark: [CuteSpringTheme](https://tweakcn.com/themes/cmr5kll1g000004jxcs7c0gl5), using the reference's dark tokens.
- Designbyte: [designbyte](https://tweakcn.com/themes/cmcup07dt000104l4hj4eferh), using its authored dark and matching light tokens.

Public registry exports are available at `https://tweakcn.com/r/themes/<id>`. Their OKLCH color values are converted to sRGB hex values in `src/theme/reference-palettes.ts` so the same palette works with React Native and web. Primary fills, backgrounds, card colors and accents retain the selected reference colors. Label colors with insufficient contrast are adjusted toward a readable foreground. This imports the color palettes into the existing Memoraid layout and typography; it does not load external theme CSS, fonts or scripts at runtime.

`src/theme/palettes.ts` resolves the palette and provides shared NativeWind variables plus explicit colors for navigation and native props. Compatibility aliases recolor existing study screens. `ThemeProvider` applies variables to its native subtree and the web document so modal portals inherit them too. The palette stays selected when device appearance changes.

## Mathematical input

Static equations, math fields, keyboard keys and handwriting surfaces follow the selected colors. Saved ink uses coordinates rather than baked-in colors, so changing the appearance preserves and recolors existing strokes. Recognition PNGs are always rendered separately as dark ink on white, independently of the visible canvas. This keeps transcription input and cache identity stable across themes.

## Verification

Behavioral tests cover the selected light/dark sources, readable label contrast, palette fallback and persistence without overwriting the existing mode preference. Browser checks cover palette/mode switching, reload persistence, system appearance, modal/math surfaces and consistent recognition images. Web and Android exports check bundling; physical tablet and iOS appearance still need device verification.

Verified for this change: 53 Node tests, TypeScript, web export and Android Hermes export passed. Chromium checks confirmed both palettes/modes, selection persistence after reload, system light/dark changes, readable legacy screen text, and a 390px layout. Changing the same drawing from Pink light to dark produced identical PNGs with white paper and preserved nonempty ink. These were mouse-driven browser checks, not physical stylus or model-accuracy measurements.
