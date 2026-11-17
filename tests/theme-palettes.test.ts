import test from "node:test";
import assert from "node:assert/strict";
import {
  THEME_OPTIONS,
  themeAccentInk,
  contrast,
  themeColors,
  themeVariables,
  decodeThemePalette,
} from "../src/theme/palettes";
import {
  loadThemePalette,
  saveThemePalette,
  loadThemePreference,
  saveThemePreference,
} from "../src/services/secure/preferences-service.web";
test("Pink uses the separately selected light and dark references; Designbyte has both modes", () => {
  assert.equal(themeColors("pink", "light").primary, "#fb7185");
  assert.equal(themeColors("pink", "dark").background, "#2d1b22");
  assert.equal(themeColors("pink", "dark").primary, "#ff8da1");
  assert.equal(themeColors("designbyte", "dark").background, "#000000");
  assert.equal(themeColors("designbyte", "light").background, "#fdfdfd");
  assert.equal(
    themeColors("designbyte", "light").primary,
    themeColors("designbyte", "dark").primary,
  );
});
test("all palettes keep important labels readable on their actual fills", () => {
  for (const { id } of THEME_OPTIONS)
    for (const mode of ["light", "dark"] as const) {
      const c = themeColors(id, mode);
      assert.ok(contrast(themeAccentInk(c), c.card) >= 4.5);
      for (const [text, background] of [
        [c.foreground, c.background],
        [c.primaryForeground, c.primary],
        [c.secondaryForeground, c.secondary],
        [c.dangerForeground, c.danger],
        [c.mutedForeground, c.card],
        [c.mutedForeground, c.background],
      ])
        assert.ok(
          contrast(text, background) >= 4.5,
          `${id}/${mode}: ${text} on ${background}`,
        );
      assert.match(themeVariables(c, mode)["--color-primary"], /^\d+ \d+ \d+$/);
    }
});
test("palette persistence preserves the existing independent mode preference", async () => {
  const values = new Map<string, string>([
    ["quiztography.theme-preference", "dark"],
  ]);
  const previous = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    },
    configurable: true,
  });
  try {
    assert.equal(await loadThemePalette(), "classic");
    assert.equal(await loadThemePreference(), "dark");
    await saveThemePalette("pink");
    assert.equal(await loadThemePreference(), "dark");
    assert.equal(await loadThemePalette(), "pink");
    await saveThemePreference("system");
    await saveThemePalette("designbyte");
    assert.equal(await loadThemePreference(), "system");
    assert.equal(await loadThemePalette(), "designbyte");
    values.set("memoraid.theme-palette", "invalid");
    assert.equal(await loadThemePalette(), "classic");
    assert.equal(decodeThemePalette(null), "classic");
  } finally {
    if (previous === undefined) Reflect.deleteProperty(globalThis, "window");
    else
      Object.defineProperty(globalThis, "window", {
        value: previous,
        configurable: true,
      });
  }
});
