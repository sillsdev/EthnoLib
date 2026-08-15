# The fonts the demo's pretend host app ships

These stand in for the font files an installed app carries in its own
installation — the reason a machine that has never been online can still be
offered a font it does not have. The demo's "Host ships Andika & Noto Sans Thai"
switch hands them to the chooser; see `src/demos/hostBundledFonts.ts`.

They live under `public/` deliberately: the demo serves them from its own origin,
and the connection simulator leaves same-origin requests alone, so with the
connection switched to Offline they stay readable exactly as a file on disk would.

| File | Family | Version | From | Licence |
| --- | --- | --- | --- | --- |
| `Andika-Regular.ttf` | Andika | 7.000 | https://fonts.languagetechnology.org/fonts/sil/andika/Andika-Regular.ttf | OFL 1.1, `OFL-Andika.txt` |
| `NotoSansThai-Regular.ttf` | Noto Sans Thai | — | https://raw.githubusercontent.com/notofonts/notofonts.github.io/main/fonts/NotoSansThai/full/ttf/NotoSansThai-Regular.ttf | OFL 1.1, `OFL-NotoSansThai.txt` |

Both are under the SIL Open Font License 1.1, whose terms require the licence to
travel with the font; hence the two `OFL-*.txt` files beside them. Neither has a
Reserved Font Name problem here — nothing is modified or renamed.

One Latin and one Thai, so switching the demo's language between (say) Fulfulde
and Thai shows a host font that fits and a host font that does not.
