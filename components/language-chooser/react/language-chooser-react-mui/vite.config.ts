/// <reference types='vitest' />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";
import * as path from "path";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { lingui } from "@lingui/vite-plugin";

export default defineConfig({
  root: __dirname,
  cacheDir:
    "../../../../node_modules/.vite/components/language-chooser/react/language-chooser-react-mui",

  plugins: [
    react({
      plugins: [["@lingui/swc-plugin", {}]], // needed for lingui
    }),
    lingui(),
    nxViteTsPaths(),
    dts({
      entryRoot: "src",
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
      entry: "src/index.ts",
      name: "@ethnolib/language-chooser-react-mui",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "@emotion/react",
        // Externalizing "@emotion/styled" broke the package. I didn't figure out why
        "@mui/material",
        "react",
        "react-dom",
        "react/jsx-runtime",
      ],
    },
  },
  server: {
    port: 5173, // Should match the port used in playwright.config.ts
  },
});
