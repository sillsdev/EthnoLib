/// <reference types='vitest' />
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import * as path from "path";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

export default defineConfig({
  root: __dirname,
  cacheDir:
    "../../../node_modules/.vite/components/state-management/state-management-core",

  plugins: [
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
      name: "@ethnolib/state-management-core",
      fileName: "index",
      formats: ["es", "cjs"],
    },
  },
});
