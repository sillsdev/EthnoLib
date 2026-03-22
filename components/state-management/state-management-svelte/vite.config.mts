/// <reference types='vitest' />
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import * as path from "path";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  root: __dirname,
  cacheDir:
    "../../../node_modules/.vite/components/state-management/state-management-svelte",

  plugins: [
    svelte(),
    nxViteTsPaths(),
    dts({
      entryRoot: ".",
      tsconfigPath: path.join(__dirname, "tsconfig.lib.json"),
    }),
  ],

  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      entry: "./index.ts",
      name: "@ethnolib/state-management-svelte",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      // Do not bundle dependencies — the consuming app must supply them.
      // This is critical for @ethnolib/state-management-core: if it were
      // bundled here AND in @ethnolib/language-chooser-controller, the two
      // copies would produce distinct Field classes, breaking instanceof checks.
      external: ["@ethnolib/state-management-core", "svelte", /^svelte\//],
    },
  },
});
