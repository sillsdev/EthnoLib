# @ethnolib/font-chooser-react-mui

A MUI styled, full-screen React component for choosing a font.

The chooser is a two-pane layout. On the left is the list of available fonts,
each row carrying icons for its license and its download status. On the right is
a detail pane for the selected font: license information, alphabet coverage for
the language being worked in, and the character variant (cvXX) picker, which is
embedded from [`@ethnolib/character-variants-react-mui`](../character-variants-react-mui/README.md).

The download button is a callback: the component reports that the user asked for a
font, and the host application decides what that means. It stays storage-agnostic
on purpose — see [Running the demo](#running-the-demo) for one implementation of
the host's half, using `FontFace` for the length of a session.

## Shape memory and language defaults

Letter-shape picks are reported two ways. `onChoicesChange` carries the raw tag choices
(`{ cv43: 2 }`), which are CSS-facing and mean nothing outside the current font. The
durable, font-independent facts flow through two newer props:

- `shapeMemory` / `onShapeMemoryChange` — the user's picks as facts about the language
  ("Ŋ: capital form"), kept by the host per language and passed back in. Opening a font
  that offers a remembered shape puts it in force without re-asking.
- `onEffectiveShapesChange` — the full set of shape settings in force for the selected
  font, every row tagged with its source: a pick, a remembered fact, an SLDR default, or
  the font's own form.

`fontFeatureDefaults` supplies the language's recommended settings, keyed by font name —
fetch them with `createSldrFontFeaturesProvider` from `@ethnolib/font-core`. They apply
wherever the user hasn't decided otherwise; an SLDR entry for one SIL LCG font (Charis,
Doulos, Gentium, Andika) also serves its siblings, whose `cvNN` numbering is verified
identical. Fonts the SLDR names get a "recommended for your language" mark in the list.

Switching fonts now derives each row afresh (remembered fact, else SLDR default, else
font default) instead of carrying raw tags over — which also fixes the bug where a
`cvNN` picked on one font silently applied to an unrelated feature of the next.

`debug` shows where every setting came from: captions on the shape rows and a collapsed
JSON block at the pane's foot. The demo has a "Debug info" switch for it, remembered in
local storage and off by default.

## Fonts that aren't installed yet

A catalog entry with `installed: false` and a `fileUrl` is a font the chooser can
read without the font being on the machine: it fetches the file and reads coverage,
license hints and the letter shapes out of it, so the detail pane says what the
download would actually get you. The letter-shape pickers stay ghosted and "Use
this font" stays disabled until the font is really installed, which is the host
app's job.

## Google Fonts

`fetchGoogleFontsCatalog`, from
[`@ethnolib/font-core`](../../common/font-core/README.md), turns the [Google Fonts
Developer API](https://developers.google.com/fonts/docs/developer_api) into
`FontInfo[]` ready to pass as the `fonts` prop. Every Google Fonts family is under
the OFL, Apache 2.0 or the Ubuntu Font Licence, so they all come back as
`license: "open"`.

```ts
import {
  fetchGoogleFontsCatalog,
  notoOnly,
  guessSubsetsForAlphabet,
} from "@ethnolib/font-core";

const fonts = await fetchGoogleFontsCatalog({
  apiKey: "…",
  sort: "popularity",
  familyFilter: notoOnly,
  subset: guessSubsetsForAlphabet(alphabet)[0],
});
```

The API needs a key. Either give it one with `apiKey`, or point `baseUrl` at your
own proxy that holds the key server-side and answers in the same shape:

```ts
await fetchGoogleFontsCatalog({ baseUrl: "https://example.org/api/webfonts" });
```

`familyFilter` narrows the result client-side (`notoOnly` is provided, since the
Noto families between them cover nearly every script). `subset` narrows it
server-side; `guessSubsetsForAlphabet` is a best-effort guess at which Google
subsets an alphabet needs, and returns `[]` rather than guessing when it meets a
character it doesn't recognize.

The helper does no caching of its own — the catalog is a few hundred kilobytes and
the key is quota-metered, so how long an answer stays good is the caller's call.

## Running the demo

From this directory:

```sh
npm run dev
```

The demo serves on port 5175 (5173 is the language chooser demo, 5174 the
character variants demo, so all three can run at once).

There is nothing to configure: the fonts it offers come from services that need no
API key, and `@ethnolib/font-core` caches their answers in local storage itself.

The page is laid out as a host app would see it: the language and the alphabet are
the host's, on its own grey chrome, and the chooser below them is drawn as the
dialog box the host would pop up.

Everything starts from a language. The demo opens on Nigerian Fulfulde (`fuv`)
with nothing to click; pick another with the **Choose…** button. The SLDR fills
the alphabet field in from the language's exemplar characters — edit it and the
suggestions follow — and the fonts are the Language Font Finder's recommendations
for that language, ahead of everything Fontsource finds for the alphabet. A
language the SLDR has no alphabet for still gets the Language Font Finder's list.
A language the SLDR has never heard of falls back to shorter forms of its tag and
then to its macrolanguage, so Maasina Fulfulde (`ffm`) gets Fulah's (`ff`)
alphabet.

The example paragraph is real writing in the chosen language, fetched from
Google's gflanguages data. For a language that data set doesn't cover, the example
is made up out of the alphabet and headed "Made up example (lorem-ipsum style)" so
nobody mistakes it for their own language.

**Downloading.** "Download this font" in the demo fetches the file and registers it
with the browser as a `FontFace`. Nothing is installed on the machine and nothing
survives a reload: for the rest of the session the family draws text and the demo
keeps its bytes to hand back for coverage and letter-shape reading, which is enough
for the details pane to fill in as though the font were installed. A host app that
really installs fonts does something else here; the component only reports that the
user asked.

For hosts that want the Google Fonts catalog instead, `fetchGoogleFontsCatalog` in
`@ethnolib/font-core` is still there; see [Google Fonts](#google-fonts) above for
the key it needs.

## Status

All strings are hardcoded English. Lingui localization is deferred, matching the
current state of the character variants package.
