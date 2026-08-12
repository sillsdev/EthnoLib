Papercuts for EthnoLib — small dev/agent/tooling friction points, captured now and fixed
later. See the "papercut" skill for the procedure.

Note: when resolving a git merge conflict here, keep both sides' entries unless they merge cleanly.

---

## 2026-08-12 — Nx daemon hangs; --daemon=false flag is a trap
- **Cut:** The Nx daemon hangs on at least one dev machine (`nx show projects` prints its results then never exits; `npm install && npx nx show projects` stalled 4+ minutes). And `--daemon=false` on `nx <target> <project>` doesn't disable the daemon — nx forwards the flag to the underlying executor, so vite/vitest dies with "Unknown option --daemon".
- **Idea:** Document the working pattern in the repo's agent/dev docs: set the env var instead (PowerShell `$env:NX_DAEMON="false"`, bash `NX_DAEMON=false npx nx ...`), give nx/npm generous timeouts, and kill hung processes rather than waiting. Or investigate why the daemon wedges on Windows and pin/patch it.
- **Context:** CharacterVariants branch work, Hatton's machine, 2026-08-12; hit by Claude agents building the fonts packages.
