/// <reference types='vitest' />
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import dts from "vite-plugin-dts";
import * as path from "path";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

export default defineConfig({
  root: __dirname,
  cacheDir:
    "../../../../node_modules/.vite/components/language-chooser/svelte/language-chooser-svelte-daisyui",

  plugins: [
    nxViteTsPaths(),
    svelte(),
    dts({
      entryRoot: ".",
      tsconfigPath: path.join(__dirname, "tsconfig.lib.json"),
    }),
  ],

  css: {
    postcss: "./postcss.config.js",
  },

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
      name: "@ethnolib/language-chooser-svelte-daisyui",
      fileName: "index",
      formats: ["es", "cjs"],
    },
  },
});
