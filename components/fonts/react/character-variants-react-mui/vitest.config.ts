/// <reference types="vitest" />
import { defineConfig } from "vite";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

// The variant grouping this package tests is plain data, so the tests need no DOM.
// The paths plugin is here because they import types from the font-core package,
// which resolves to its source in this repo.
export default defineConfig({
  plugins: [nxViteTsPaths()],
  test: {
    environment: "node",
    expect: {
      requireAssertions: true,
    },
  },
});
