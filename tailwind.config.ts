import type { Config } from "tailwindcss";

/**
 * Emotion-driven, non-traditional palette.
 * Deep indigo + warm amber — deliberately far from classic "golf" greens/plaids.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f4f4f7",
          100: "#e6e6ee",
          200: "#c7c7d9",
          300: "#9a9abc",
          400: "#6b6b94",
          500: "#4a4a75",
          600: "#36365c",
          700: "#272744",
          800: "#1a1a30",
          900: "#0f0f1f",
          950: "#07070f",
        },
        ember: {
          50: "#fff7ed",
          100: "#ffedd4",
          200: "#ffd7a8",
          300: "#ffb870",
          400: "#ff9138",
          500: "#ff6f10",
          600: "#f05706",
          700: "#c74407",
          800: "#9e360e",
          900: "#802f0f",
        },
        rose: {
          500: "#ec4a6a",
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.6s ease-out forwards",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
