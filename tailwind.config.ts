import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          ink: "#111827",
          paper: "#f7f5ef",
          line: "#d7d1c3",
          accent: "#0f766e",
          plum: "#6d28d9",
          rust: "#b45309"
        }
      },
      boxShadow: { soft: "0 18px 60px rgba(17, 24, 39, 0.12)" }
    }
  },
  plugins: [typography]
} satisfies Config;
