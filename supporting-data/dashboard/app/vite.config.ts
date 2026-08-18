import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs: GitHub Pages serves this from a repository subpath, and
  // `./` also lets the built dist/ be opened from any directory.
  base: "./",
});
