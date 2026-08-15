/// <reference types='vitest' />
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import * as path from "path";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

export default defineConfig({
  root: __dirname,
  cacheDir: "../../../../node_modules/.vite/components/fonts/common/font-core",

  plugins: [
    nxViteTsPaths(),
    dts({
      entryRoot: "src",
      tsconfigPath: path.join(__dirname, "tsconfig.lib.json"),
    }),
  ],

  // Configuration for building the library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // Two entries, because `bundled` carries about 1.5MB of snapshot JSON and
      // a host that imports only the package root must not be given it. Rollup
      // keeps what they share in its own chunk; the JSON, imported from nothing
      // else, stays inside bundled's.
      entry: {
        index: "src/index.ts",
        bundled: "src/bundled.ts",
      },
      name: "@ethnolib/font-core",
      // The names the package.json exports point at, kept as they were when
      // this built one entry: `.mjs` for the ES build, `.js` for CommonJS.
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "js"}`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["react", "react-dom"],
    },
  },
});
