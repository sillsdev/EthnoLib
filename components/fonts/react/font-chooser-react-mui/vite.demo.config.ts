import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as fs from "fs";
import * as path from "path";
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { lingui } from "@lingui/vite-plugin";

// Builds the demo (index.html + src/demos) as a deployable static site, for
// sharing the component with reviewers. This is separate from vite.config.ts,
// which builds the publishable library: that one is in library mode and emits
// index.js with react/mui externalized, so it can't produce a site. Nothing
// here is part of the published package.
//
// Deploy with:
//   npx vite build --config vite.demo.config.ts
//   npx vercel deploy --prod --prebuilt --yes
//
// The output goes to .vercel/output/, Vercel's Build Output API layout, so that
// `--prebuilt` uploads these files and runs nothing on Vercel's side. That is
// not just a speed choice: deploying a plain folder makes the Vercel CLI copy
// the nearest ancestor package.json in beside the files to sniff the framework,
// and the build machine then tries to `npm install` our workspace-only deps
// (@ethnolib/font-core and friends), which are not on npm. --prebuilt skips
// install and build entirely.
const OUT_DIR = "./.vercel/output/static";

// The one piece of metadata --prebuilt requires beside the static files. The
// route rule serves any unmatched path from index.html, since the demo is a
// single-page app.
function emitBuildOutputConfig() {
  return {
    name: "emit-vercel-build-output-config",
    closeBundle() {
      fs.writeFileSync(
        path.join(__dirname, ".vercel/output/config.json"),
        JSON.stringify(
          {
            version: 3,
            routes: [{ handle: "filesystem" }, { src: "/.*", dest: "/index.html" }],
          },
          null,
          2
        ) + "\n"
      );

      // nxViteTsPaths copies the project's package.json into outDir from its
      // writeBundle hook, which is meant for a publishable library build. Here
      // that would publish the file as part of the site, and a package.json at
      // the deploy root is what makes Vercel try to install our workspace-only
      // deps. closeBundle runs after writeBundle, so this undoes it.
      fs.rmSync(path.join(__dirname, OUT_DIR, "package.json"), { force: true });
    },
  };
}

export default defineConfig({
  root: __dirname,
  cacheDir:
    "../../../../node_modules/.vite/components/fonts/react/font-chooser-react-mui-demo",

  // Relative asset URLs, so the same output works at a domain root or under a
  // subpath (GitHub Pages) without rebuilding.
  base: "./",

  plugins: [
    react({
      plugins: [["@lingui/swc-plugin", {}]],
    }),
    lingui(),
    nxViteTsPaths(),
    emitBuildOutputConfig(),
  ],

  // Same aliases as vite.config.ts: the embedded language chooser and the
  // language data under it resolve to build output this working tree doesn't
  // have, so point them at source.
  resolve: {
    alias: {
      "@ethnolib/language-chooser-react-mui": path.resolve(
        __dirname,
        "../../../language-chooser/react/language-chooser-react-mui/src/index.ts"
      ),
      "@ethnolib/find-language": path.resolve(
        __dirname,
        "../../../language-chooser/common/find-language/index.ts"
      ),
    },
  },

  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
  },
});
