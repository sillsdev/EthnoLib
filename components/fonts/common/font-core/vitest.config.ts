/// <reference types="vitest" />
import { defineConfig } from "vite";

// The font parsing this package tests is plain byte reading, so the tests need no
// DOM.
export default defineConfig({
  test: {
    environment: "node",
    expect: {
      requireAssertions: true,
    },
  },
});
