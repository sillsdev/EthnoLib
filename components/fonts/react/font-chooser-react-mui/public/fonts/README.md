# The fonts the demo's pretend host app ships

These stand in for the font files an installed app carries in its own
installation — the reason a machine that has never been online can still be
offered a font it does not have. The demo's "Provide minimum font bundle"
switch, on unless you turn it off, hands them to the chooser; see
`src/demos/hostBundledFonts.ts` and `src/demos/hostFontLibrary.ts`.

They live under `public/` deliberately: the demo serves them from its own origin,
and the connection simulator leaves same-origin requests alone, so with the
connection switched to Offline they stay readable exactly as a file on disk would.

## The binaries are fetched, not hand-placed

Do not add or replace font files here by hand. `src/demos/tools/fetchMinimumFontBundle.mjs`
owns this folder's `.ttf` files and `bundleManifest.json`:

```
npm run fetch-fonts            # fetch anything missing, rewrite the manifest
npm run fetch-fonts -- --force # re-download everything
```

It reads [silnrsi/fonts' `families.json`](https://raw.githubusercontent.com/silnrsi/fonts/main/families.json),
downloads each family's regular, bold, italic and bold-italic — whichever of
those the family publishes — and writes `bundleManifest.json` with the display
name, family id, licence and per-face weight, slant and byte count. The demo
reads only that manifest, so the list of families is the script's array and
nothing else.

The fetched `.ttf` files and `bundleManifest.json` are gitignored, so a fresh
checkout does not have them: run `npm run fetch-fonts` once before the bundle
shows up in the demo. Two faces are the exception, `Andika-Regular.ttf` and
`NotoSansThai-Regular.ttf`, committed from when those two were the whole bundle
and still tracked so a checkout is not left with nothing.

`bundleManifest.json` is generated. Edit the script and re-run it; the result
stays local.

## What is in it

Twenty families chosen by greedy language coverage over the language/font data
bundled into `@ethnolib/font-core`; five more chosen by speaker count rather
than language count — the mid-size Indian scripts the greedy pass undervalues
(Malayalam, Odia, Gujarati, Gurmukhi, Sinhala); plus Andika, which is in the
bundle for a different reason: it is the literacy font, drawn for someone
learning to read.

Charis, Scheherazade New, Annapurna SIL, Abyssinica SIL, Awami Nastaliq,
Noto Sans Tifinagh, Khmer Mondulkiri, Noto Sans Miao, Noto Serif Bengali,
Harmattan, Noto Serif Tibetan, Padauk, Noto Sans Thai, Noto Sans Telugu, Lateef,
Noto Sans Tamil, Noto Sans Canadian Aboriginal, Noto Sans Coptic, Badami,
Noto Sans Lao, Noto Sans Malayalam, Japa Sans Oriya, Noto Sans Gujarati,
Noto Sans Gurmukhi, Noto Sans Sinhala, Andika.

As of the last fetch that is 56 files: 20.7 MB raw, 7.7 MB compressed with
brotli, which is the number that matters for an installer. Andika's four faces
are 3.2 MB raw and 1.3 MB brotli of that. The script prints the same breakdown
per family every time it runs.

Only the four styles a document editor actually asks for are taken. The families
publish a good deal more — mediums, semibolds, thins, condensed and UI cuts —
and carrying them would roughly double the bundle for weights nothing in the
product selects.

## Licence

Every family here is under the SIL Open Font License 1.1 — the manifest records
that per family, and the fetch script takes the licence field from
`families.json` rather than assuming it. Nothing is modified or renamed, so no
Reserved Font Name question arises.

The OFL requires the licence to travel with the font, and the two `OFL-*.txt`
files here cover Andika and Noto Sans Thai only, from when those two were the
whole bundle. This folder feeds a demo page, not a shipped product; a host app
that really ships this bundle needs each family's own copyright notice and
licence file alongside it, which the fetch script does not yet collect.
