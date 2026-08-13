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
    "../../../../node_modules/.vite/components/fonts/react/font-chooser-react-mui",

  plugins: [
    // The lingui plugins are here for the demo only: it embeds the language
    // chooser, whose source is written with lingui macros, and those macros need
    // transforming wherever they are compiled. Nothing in this package's own
    // sources is localized yet.
    react({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
    lingui(),
    nxViteTsPaths(),
    dts({
      entryRoot: "src",
      tsconfigPath: path.join(__dirname, "tsconfig.lib.json"),
    }),
  ],

  resolve: {
    alias: {
      // The demo's language chooser, from source rather than from the package's
      // build output (which is git-ignored and may not exist). Deliberately not a
      // tsconfig path: `tsc` would then typecheck that package's sources, and its
      // own `typecheck` script compiles nothing, so they don't currently pass. See
      // src/demos/languageChooser.d.ts for what the demo compiles against instead.
      "@ethnolib/language-chooser-react-mui": path.resolve(
        __dirname,
        "../../../language-chooser/react/language-chooser-react-mui/src/index.ts"
      ),
      // Likewise for the language data underneath it, which the demo asks about
      // macrolanguages directly. The published package points at build output this
      // working tree doesn't have.
      "@ethnolib/find-language": path.resolve(
        __dirname,
        "../../../language-chooser/common/find-language/index.ts"
      ),
    },
  },

  // Configuration for building the library. The demo (index.html + src/main.tsx)
  // is only for `npm run dev`; it is not part of the published package.
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
      name: "@ethnolib/font-chooser-react-mui",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "@emotion/react",
        // Externalizing "@emotion/styled" broke the language chooser package
        // (we never figured out why), so we leave it bundled here too.
        "@ethnolib/character-variants-react-mui",
        "@ethnolib/font-core",
        "@mui/material",
        "react",
        "react-dom",
        "react/jsx-runtime",
      ],
    },
  },
  server: {
    // 5173 is taken by the language chooser demo and 5174 by the character
    // variants demo, so that all three can run at once.
    port: 5175,
  },
});
