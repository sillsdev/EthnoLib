# Character Variants (React, MUI)

`@ethnolib/character-variants-react-mui` is a React component, styled with MUI, for a
font's OpenType **character variants** — the `cv01`..`cv99` features a font uses to offer
alternate shapes for particular characters (a single-storey _a_, a slashed zero, a
different tail on a _ɡ_, and so on).

It is meant to be dropped into a host app's own dialog. There is also a demo app here so
we can exercise it during development.

## Status

Early scaffolding; the API will change. The component lists the variants a font declares,
narrows them to an alphabet, and lets the user pick one form of each. It does not yet do
anything with those picks beyond reporting them through `onChoicesChange`.

## Running the demo

From anywhere in the repo:

```
nx dev @ethnolib/character-variants-react-mui
```

That starts Vite with hot reload on http://localhost:5174 and opens a browser. Pick a font,
type the alphabet you care about, and the page shows a card per `cvXX` feature that touches
those characters, with a tile for each form the font offers. The demo remembers the font
(defaulting to Andika) and the alphabet in local storage.

Listing installed fonts uses the
[Local Font Access API](https://developer.mozilla.org/en-US/docs/Web/API/Window/queryLocalFonts),
which is Chromium-only and asks the user's permission, so the demo needs Chrome or Edge. The
browser only grants that permission off a click, so the first visit shows a "List installed
fonts…" button.

Fonts worth trying: Andika, Charis SIL, Gentium, and Fira Code all declare character
variants; most system fonts declare none. Once the fonts are listed, the chooser looks
through them in the background and rearranges itself:

- Fonts that can write every character of the alphabet come first, then a dividing line, then
  everything else. Coverage is read from each font's `cmap` table, so it is what the font
  really has rather than a guess from its name. 227 of the 694 faces installed here can write
  `a e o ŋ ɔ Ɔ ɓ 0`.
- Within that, a font with letter shapes to offer for this alphabet is shown bold and in the
  theme's primary color; a font with none at all is greyed; a font whose letter shapes don't
  touch this alphabet is left plain. Only 34 of those 694 faces (13 families) declare any
  `cvXX` at all.

A font the sweep hasn't reached yet sits below the line, so the list only promotes fonts as it
learns about them. On the machine described above the whole sweep takes about three seconds in
Chrome, almost all of it in `FontData.blob()` (a few ms per face, whatever the file size), and
never blocks the page: no main-thread task during the sweep exceeded 50 ms.

The demo also reads two query parameters, which is how an e2e test will drive it:
`?fontUrl=<url of a .ttf/.otf>` skips the chooser and loads that font at startup, and
`?primaryColor=<css color>` themes the page.

## Using the component

The font chooser is part of the component. The host app holds the current font and passes
it in, so it can persist that choice and show the same font elsewhere in its own UI:

```tsx
import { CharacterVariants } from "@ethnolib/character-variants-react-mui";

const [font, setFont] = useState("Andika");
const [alphabet, setAlphabet] = useState("a e o ŋ ɓ");

<CharacterVariants
  font={font}
  onFontChange={setFont}
  alphabet={alphabet}
  onAlphabetChange={setAlphabet}
  onChoicesChange={(choices) => save(choices)}
/>;
```

Only `font` is required. `alphabet` narrows the cards to the variants that touch those
characters (empty shows all), and the alphabet field appears only if `onAlphabetChange` is
given. The characters that have a variant to choose among are picked out in that field, in
bold and in the theme's primary color; the marks are worked out when the field is first shown
and again when it loses focus, so they don't shift while the user is typing. `onChoicesChange` reports which form the user picked per feature, as
`{ cv10: 1, cv13: 0 }`, where 0 is the font's default; pass `choices` too if the app wants to
own that state rather than let the component keep it.

By default the chooser lists the fonts installed on the machine and reads their bytes with
the Local Font Access API. Two props override that for an app with its own idea of which
fonts exist:

- `availableFonts?: string[]` — offer these families instead of the installed ones.
- `getFontData?: (font: string) => Promise<FontDataResult>` — where the bytes come from. The
  bytes matter because they are the only place `cvXX` information lives; a family name alone
  tells you nothing about a font's features. An app supplying bytes for a font that isn't
  installed also has to register it (`document.fonts.add`) before CSS can render it.

  A loader may return the bytes on their own, as before, or `{ data, postscriptName }`. The
  name is worth supplying when the app knows it, because the bytes of a face in a collection
  (`.ttc`) are the bytes of the whole collection, and only the name says which font inside is
  meant. `loadLocalFontDataByFamilyWithName` is the built-in loader that returns both, and it is what
  the component uses by default; `loadLocalFontDataByFamily` still returns bare bytes for a
  caller that wants them. `useFontData` normalizes either shape and reports the name it got
  alongside the bytes.

`CharacterVariantList` is the same presentation without the chooser, for an app that already
has a font picker; it takes `fontFamily` and `fontData` directly.

## What's inside

| File                                                                               | Role                                                                                                                             |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/CharacterVariants.tsx`                                                        | The component apps will embed: chooser plus variants                                                                             |
| `src/FontChooser.tsx`                                                              | The font combo box                                                                                                               |
| `src/AlphabetField.tsx`                                                            | The alphabet text field                                                                                                          |
| `src/CharacterVariantList.tsx`, `src/CharacterVariantCard.tsx`, `src/FormTile.tsx` | Presentation of the variants themselves                                                                                          |
| `src/alphabet.ts`                                                                  | Parsing the typed alphabet, and narrowing the variants to it                                                                     |
| `src/readCharacterVariants.ts`                                                     | Reads the `GSUB` and `name` tables out of raw font bytes to find the `cvXX` features and their labels                            |
| `src/fontLicense.ts`                                                               | Reads the `name` and OS/2 licence hints out of a font, and sorts them into four rough categories                                 |
| `src/useFontData.ts`                                                               | The hook behind the component: loads one family's bytes, with a retry for after the font permission is granted                   |
| `src/localFonts.ts`                                                                | Local Font Access API wrapper (list families, fetch a family's bytes)                                                            |
| `src/fontCoverage.ts`                                                              | Reads a font's `cmap` to see which characters it actually has                                                                    |
| `src/sfntBlob.ts`                                                                  | Ranged reads of a font Blob's table directory, and picking the right font out of a `.ttc` collection                             |
| `src/scanForCharacterVariants.ts`                                                  | The background sweep behind the chooser's ordering: coverage, a cheap "any `cvXX`?" check, then a full read of the few that pass |
| `src/demos/`, `src/main.tsx`, `index.html`                                         | The demo app; not part of the published package                                                                                  |

## Licence hints

`readLicenseHints` and `classifyLicense` answer, roughly, whether a font looks like one
the user may pass on with their book: `open` (an OFL-family licence we recognize),
`system-restricted` (the font asks not to be embedded at all), `limits-apply` (something
is declared that we can't read as open), or `unknown`. The background sweep runs this over
every installed family, so a `FamilyScan` carries `license` and `licenseUrl` alongside the
coverage and variants.

These are hints for a nudge in the UI, not a licence check. The two things a font can tell
us are free text (`name` IDs 13 and 14, which a foundry fills in however it likes) and the
OS/2 `fsType` bits, which govern _embedding_ and say nothing about redistributing the font
file. Where the host app knows something about a font — it shipped it, or its font server
said so — that outranks anything read here, and it is up to the host app to enforce that
precedence.

## Tests

`npm run testonce -w @ethnolib/character-variants-react-mui`, or
`npx vitest run --root components/fonts/react/character-variants-react-mui`. They cover the
byte-level readers against synthetic fonts built in `src/testFontBuilder.ts`; the React
side has no tests yet.

## Font parsing

`readCharacterVariants` parses the font itself rather than pulling in opentype.js or
fontkit, because all it needs is one table walk, and the `cvXX` `FeatureParams` (the
labels, sample text, and affected characters) aren't exposed by those libraries anyway.
It understands uncompressed sfnt data: `.ttf`, `.otf`, and `.ttc`.

A `.ttc` needs care. The collection holds several families in one file, and the Local Font
Access API hands back the whole file whichever face was asked for, so reading the first
font in it reports some other family's characters, features and licence as this face's —
which is how a font came to claim it could write an alphabet that it visibly rendered in a
fallback face. Every reader therefore takes an optional PostScript name
(`readCoverageRanges(blob, postscriptName)`, `readCharacterVariants(bytes, postscriptName)`,
and so on) and finds the font in the collection that answers to it, matching on `name` ID 6,
then ID 4, then ID 1. Omitting the name still reads the first font, so existing callers
behave as they did — but a caller that knows the face should pass it. The background sweep
does, since it started from a PostScript name.

## Not done yet

- Doing anything with the user's choices beyond reporting them (no `font-feature-settings`
  string, no persistence in the component).
- Matching an alphabet against a variant when the font declares neither a character list nor
  usable sample text: such variants are dropped, so a font that documents its features poorly
  will look emptier than it is.
- Showing any of this in the UI beyond the `cvXX` cards: the licence category and
  `hasOldStyleNumerals` are read and reported, but nothing displays them yet.
- Localization. The rest of the repo uses lingui; this package has no `Trans` wrappers yet,
  so its handful of English strings are hard-coded.
- Storybook stories and Playwright e2e tests, both of which the language chooser has.
- Publishing: the package is not in the `release.projects` list in `nx.json`, so nothing
  gets versioned or pushed to npm until we add it there.
