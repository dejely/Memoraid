const { hairlineWidth } = require("nativewind/theme");

module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f7fb",
          100: "#e8edf6",
          200: "#cbd6ea",
          300: "#a7b8d7",
          400: "#6f88b7",
          500: "#4f6a99",
          600: "#3c5179",
          700: "#2a3a59",
          800: "#172136",
          900: "#0b1220"
        },
        sea: {
          50: "#f1fbfa",
          100: "#d4f4f1",
          200: "#abe6df",
          300: "#77d4cb",
          400: "#3ebaae",
          500: "#1b9f93",
          600: "#157f76",
          700: "#146660",
          800: "#134f4c",
          900: "#103f3d"
        },
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
          900: "#6f3b14"
        },
        rose: {
          500: "#d15d76"
        }
      },
      borderWidth: {
        hairline: hairlineWidth()
      },
      boxShadow: {
        soft: "0 12px 30px rgba(9, 16, 31, 0.12)"
      }
    }
  },
  plugins: []
};
