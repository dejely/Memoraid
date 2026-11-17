const { hairlineWidth } = require("nativewind/theme");

module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => [
            shade,
            `rgb(var(--color-ink-${shade}) / <alpha-value>)`,
          ]),
        ),
        sea: Object.fromEntries(
          [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => [
            shade,
            `rgb(var(--color-sea-${shade}) / <alpha-value>)`,
          ]),
        ),
        white: "rgb(var(--color-paper) / <alpha-value>)",
        ...Object.fromEntries(
          [
            "background",
            "foreground",
            "card",
            "primary",
            "primary-foreground",
            "secondary",
            "secondary-foreground",
            "muted",
            "muted-foreground",
            "accent",
            "accent-foreground",
            "border",
            "input",
            "ring",
            "danger",
            "danger-foreground",
          ].map((token) => [
            token,
            `rgb(var(--color-${token}) / <alpha-value>)`,
          ]),
        ),
        amber: {
          50: "#fff9ed",
          100: "#fef0c8",
          200: "#fddf89",
          300: "#fbc953",
          400: "#f8b52e",
          500: "#eb9a10",
          600: "#cc780b",
          700: "#a25a0d",
          800: "#854713",
          900: "#6f3b14",
        },
        rose: {
          500: "rgb(var(--color-danger-ink) / <alpha-value>)",
        },
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      boxShadow: {
        soft: "0 12px 30px rgba(9, 16, 31, 0.12)",
      },
    },
  },
  plugins: [],
};
