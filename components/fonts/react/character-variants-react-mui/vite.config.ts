/// <reference types='vitest' />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";
import * as path from "path";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

export default defineConfig({
  root: __dirname,
  cacheDir:
    "../../../../node_modules/.vite/components/fonts/react/character-variants-react-mui",

  plugins: [
    react(),
    nxViteTsPaths(),
    dts({
      entryRoot: "src",
      tsconfigPath: path.join(__dirname, "tsconfig.lib.json"),
    }),
  ],

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
      name: "@ethnolib/character-variants-react-mui",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "@emotion/react",
        // Externalizing "@emotion/styled" broke the language chooser package
        // (we never figured out why), so we leave it bundled here too.
        "@ethnolib/font-core",
        "@mui/material",
        "react",
        "react-dom",
        "react/jsx-runtime",
      ],
    },
  },
  server: {
    // 5173 is taken by the language chooser demo, so that both can run at once.
    port: 5174,
  },
});
