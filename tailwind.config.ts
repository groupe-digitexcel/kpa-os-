import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kpa: {
          navy: "#1B2B5E",
          gold: "#C9A84C",
          cream: "#FAF7EF",
        },
      },
    },
  },
  plugins: [],
};
export default config;
