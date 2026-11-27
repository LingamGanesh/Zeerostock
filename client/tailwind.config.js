/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Playfair Display for headings – refined editorial feel
        display: ["'Playfair Display'", "Georgia", "serif"],
        // DM Sans for body – clean and modern
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#312e81",
        },
        surface: {
          DEFAULT: "#0f0f1a",
          card:    "#16162a",
          border:  "#2a2a45",
        },
      },
      animation: {
        "fade-up":   "fadeUp 0.5s ease both",
        "spin-slow": "spin 1.4s linear infinite",
        "pulse-dot": "pulseDot 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%":      { opacity: 0.4, transform: "scale(0.8)" },
        },
      },
    },
  },
  plugins: [],
};
