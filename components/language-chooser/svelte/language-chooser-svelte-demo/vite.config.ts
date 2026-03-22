import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";

export default defineConfig({
  plugins: [nxViteTsPaths(), sveltekit()],
  cacheDir:
    "../../../../node_modules/.vite/components/language-chooser/svelte/language-chooser-svelte-demo",
  ssr: {
    // Process workspace packages through Vite (not externalized to Node.js)
    // so that .svelte.ts files are compiled by the Svelte compiler and
    // TypeScript source files are handled correctly.
    // Process workspace packages and their CJS transitive deps through Vite
    // rather than externalizing them to Node.js. This ensures .svelte.ts files
    // are compiled by the Svelte compiler, TypeScript source is transformed, and
    // CJS deps (lodash, fuse.js) are converted to ESM for named imports.
    noExternal: [
      "@ethnolib/find-language",
      "@ethnolib/language-chooser-controller",
      "@ethnolib/language-chooser-svelte-daisyui",
      "@ethnolib/state-management-svelte",
      "@ethnolib/state-management-core",
      "lodash",
      "fuse.js",
    ],
  },
});
