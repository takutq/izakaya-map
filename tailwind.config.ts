import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sumi: {
          950: "rgb(var(--c-sumi-950) / <alpha-value>)",
          900: "rgb(var(--c-sumi-900) / <alpha-value>)",
          800: "rgb(var(--c-sumi-800) / <alpha-value>)",
          700: "rgb(var(--c-sumi-700) / <alpha-value>)",
          600: "rgb(var(--c-sumi-600) / <alpha-value>)",
          500: "rgb(var(--c-sumi-500) / <alpha-value>)",
        },
        kinari: {
          100: "rgb(var(--c-kinari-100) / <alpha-value>)",
          200: "rgb(var(--c-kinari-200) / <alpha-value>)",
          400: "rgb(var(--c-kinari-400) / <alpha-value>)",
          500: "rgb(var(--c-kinari-500) / <alpha-value>)",
        },
        chochin: {
          DEFAULT: "#D94E34",
          hover: "#C04129",
          muted: "rgba(217, 78, 52, 0.16)",
        },
        karashi: {
          DEFAULT: "#D99B26",
          hover: "#C2881E",
          muted: "rgba(217, 155, 38, 0.16)",
        },
      },
      fontFamily: {
        sans: [
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          '"BIZ UDPGothic"',
          "Meiryo",
          "sans-serif",
        ],
        serif: [
          '"Hiragino Mincho ProN"',
          '"Yu Mincho"',
          '"BIZ UDPMincho"',
          "serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
