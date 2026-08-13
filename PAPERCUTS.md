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
