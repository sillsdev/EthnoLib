/// <reference types='vitest' />
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

export default defineConfig({
  root: __dirname,
  cacheDir:
    "../../../../node_modules/.vite/components/language-chooser/svelte/language-chooser-svelte-daisyui",

  plugins: [
    nxViteTsPaths(),
    svelte({
      dynamicCompileOptions: ({ filename, compileOptions }) => {
        const normalizedFilename = filename.replaceAll("\\", "/");

        if (
          normalizedFilename.includes("/node_modules/@storybook/svelte/") &&
          compileOptions.runes
        ) {
          return { runes: false };
        }
      },
    }),
  ],

  css: {
    postcss: "./postcss.config.js",
  },
});
