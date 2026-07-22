/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0A0E1A",
        "midnight-2": "#0F1628",
        "midnight-3": "#151E35",
        "steel": "#38BDF8",
        "aqi-good": "#22d3a5",
        "aqi-moderate": "#fde047",
        "aqi-poor": "#fb923c",
        "aqi-severe": "#ef4444",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
