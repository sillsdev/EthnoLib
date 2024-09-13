import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

export default defineConfig({
  root: __dirname,
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "language-chooser-react-mui",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs", "umd"],
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: true,
    outDir:
      "../../../../dist/components/language-picker/react/language-chooser-react-mui",
    emptyOutDir: true,
  },
  plugins: [
    react(),
    nxViteTsPaths(),
    dts({
      tsconfigPath: "./tsconfig.app.json",
      entryRoot: "src",
    }),
  ],
});
