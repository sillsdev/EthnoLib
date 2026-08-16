Papercuts for EthnoLib — small dev/agent/tooling friction points, captured now and fixed
later. See the "papercut" skill for the procedure.

Note: when resolving a git merge conflict here, keep both sides' entries unless they merge cleanly.

---

## 2026-08-12 — Nx daemon hangs; --daemon=false flag is a trap
- **Cut:** The Nx daemon hangs on at least one dev machine (`nx show projects` prints its results then never exits; `npm install && npx nx show projects` stalled 4+ minutes). And `--daemon=false` on `nx <target> <project>` doesn't disable the daemon — nx forwards the flag to the underlying executor, so vite/vitest dies with "Unknown option --daemon".
- **Idea:** Document the working pattern in the repo's agent/dev docs: set the env var instead (PowerShell `$env:NX_DAEMON="false"`, bash `NX_DAEMON=false npx nx ...`), give nx/npm generous timeouts, and kill hung processes rather than waiting. Or investigate why the daemon wedges on Windows and pin/patch it.
- **Context:** CharacterVariants branch work, Hatton's machine, 2026-08-12; hit by Claude agents building the fonts packages.

## 2026-08-13 — `typecheck` compiles nothing in language-chooser-react-mui and find-language
- **Cut:** Both packages' `typecheck` script is a bare `tsc`, and their `tsconfig.json` has `"files": []`, `"include": []` with only a `references` entry — so `tsc` (without `-b`) checks zero files and exits 0. Their sources have therefore never been typechecked, and they don't pass: pulling `@ethnolib/language-chooser-react-mui` into another package's tsconfig paths reports ~15 TS2786 errors (`'Trans' cannot be used as a JSX component` — React 17 types reject a component returning `ReactNode`), and `find-language` reports `Property 'getTextInfo' does not exist on type 'Locale'` (needs a newer `lib`). The font-chooser demo had to route around this: it consumes the language chooser through a vite `resolve.alias` plus a hand-written ambient module declaration (`src/demos/languageChooser.d.ts`) rather than a tsconfig path, so its own gate doesn't depend on fixing two other packages. Update 2026-08-13: the demo now also asks `find-language` about macrolanguages, and that needed a second shim — `tsc` resolves `@ethnolib/find-language` through the node_modules symlink and falls through the missing `index.d.ts` to `index.ts`, dragging in the `getTextInfo` error, so font-chooser's `tsconfig.json` overrides `paths` (repeating the two base entries, since `paths` replaces rather than merges) to point the package name at `src/demos/findLanguage.d.ts`.
- **Idea:** Point those `typecheck` scripts at the real config (`tsc -p tsconfig.lib.json --noEmit`, as the fonts packages do), fix the errors that surface, then drop the shim and use a normal tsconfig path.
- **Context:** CharacterVariants branch, font-chooser demo rework, 2026-08-13.

## 2026-08-13 — LFF font file URLs are CORS-blocked in the browser
- **Cut:** The Language Font Finder hands back `github.com/notofonts/.../raw/main/...ttf` URLs. Fetching one from a page fails with `net::ERR_FAILED` (github.com raw redirects carry no CORS headers), so the font chooser can't read coverage, license or letter shapes out of an LFF-suggested font that isn't installed. Seen with Noto Sans Thai for `th`.
- **Idea:** Rewrite LFF file URLs to a CORS-friendly mirror in the provider (raw.githubusercontent.com, jsDelivr), or have the host proxy them.
- **Context:** CharacterVariants branch, verifying the font-chooser demo in Chrome, 2026-08-13.

## 2026-08-15 — eslint runs from .eslintrc.json, so the react-hooks rules never load
- **Cut:** The repo has a flat config at the root (`eslint.config.mjs`, which registers `eslint-plugin-react-hooks`) *and* legacy `.eslintrc.json` files at the root and in each package. The installed eslint is 8.57, which prefers the legacy files, so the flat config — and with it every react-hooks rule — is not in effect. The visible symptom is backwards: files carrying a `/* eslint-disable react-hooks/exhaustive-deps */` block error with "Definition for rule 'react-hooks/exhaustive-deps' was not found", so `npx eslint` on `src/demos/useSuggestedFonts.ts` (and `npm run lint` in font-chooser-react-mui) fails on untouched, committed code, and an agent asked to leave lint clean burns a while proving the errors predate its change.
- **Idea:** Pick one config system — upgrade to eslint 9 and delete the `.eslintrc.json` files, or set `ESLINT_USE_FLAT_CONFIG=true` for eslint 8 — and check that the hooks rules actually run afterwards.
- **Context:** CharacterVariants branch, offline-support spike stage 4, 2026-08-15.

## 2026-08-15 — the font-chooser demo never reaches document_idle, so browser automation can't touch it
- **Cut:** With the Vite demo running (`npm run dev` in font-chooser-react-mui), every Claude-in-Chrome tool against `localhost:5176` fails: `screenshot` returns "Script injection timed out after 5000ms", and `read_page` gives up with "Page still loading (executeScript waited 45000ms for document_idle)". The page itself renders — it's the extension's `document_idle` gate that never fires, presumably because the demo keeps work in flight (the sweep over ~800 installed families, the suggestion fetches) for longer than the extension is willing to wait. So a UI change to the chooser can't be verified in the browser by an agent at all, only by the developer looking at the screen.
- **Idea:** Find what holds the page short of idle and let it settle — or give the demo a query flag (`?fonts=bundled`, say) that skips the machine-wide sweep and the network suggestions, so there is a cheap variant an agent can drive.
- **Context:** CharacterVariants branch, moving Bloom's font credits into the license popover, 2026-08-15.

## 2026-08-15 — `@ethnolib/font-core` cannot be imported from a plain node script
- **Cut:** The workspace symlink `node_modules/@ethnolib/font-core` points at the package root, whose `package.json` says `"main": "./index.js"` and `"exports": { ".": "./index.js" }` — but the build writes to `dist/`, so nothing is at that path. `import("@ethnolib/font-core")` from node therefore dies with `ERR_MODULE_NOT_FOUND … font-core\index.js`. It works everywhere else only because vite/vitest resolve the package name through the nx tsconfig paths to `src/index.ts` instead. A developer tool that is a plain node script — `src/demos/tools/fetchMinimumFontBundle.mjs`, which now computes each bundled family's coverage/licence/variants with font-core's own readers — has to reach into `../../common/font-core/dist/index.mjs` by relative path and tell the developer to build font-core first.
- **Idea:** Point the package's `main`/`types`/`exports` at `dist/` (or publish from `dist/` with a generated package.json, which is what the `dist/package.json` the build emits looks like it is for), so the package name resolves the same way for node as it does for vite.
- **Context:** CharacterVariants branch, declared family facts for the demo's bundled fonts, 2026-08-15.
