# @ethnolib/font-chooser-react-mui

A MUI styled, full-screen React component for choosing a font.

The chooser is a two-pane layout. On the left is the list of available fonts,
each row carrying icons for its license and its download status. On the right is
a detail pane for the selected font: license information, alphabet coverage for
the language being worked in, and the character variant (cvXX) picker, which is
embedded from [`@ethnolib/character-variants-react-mui`](../character-variants-react-mui/README.md).

Fonts that aren't on the machine are fetched by the component itself, so the pane
can show what they do; see [Fonts that aren't installed yet](#fonts-that-arent-installed-yet).
Nothing is installed, and where the host wants to keep the file, `onFontSelected`
hands it over.

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
identical. Fonts the SLDR names get a "recommended for this language" mark in the list.

Pass `languageName` and the chooser names the language wherever it would otherwise say
"your language" — "Supports Fulfulde", "Recommended for Fulfulde". Without it those lines
keep the old wording, so it is optional for a host that only has a tag.

Switching fonts now derives each row afresh (remembered fact, else SLDR default, else
font default) instead of carrying raw tags over — which also fixes the bug where a
`cvNN` picked on one font silently applied to an unrelated feature of the next.

`onDiagnostic(message, detail?)` is how the chooser says what it is doing and why: where
each row's setting came from as a font is derived, what it is about to report through
`onEffectiveShapesChange`, each shape the user picks, and the fetch of a font that isn't
on the machine (started, finished with a byte count, or failed). The component renders
none of it — a host puts the lines wherever its own diagnostics go, and one that passes
nothing pays nothing, since the bulky `detail` is only assembled when somebody is
listening. The demo's harness box shows them in a scrolling log.

## Fonts that aren't installed yet

A catalog entry with `installed: false` and a `fileUrl` is a font the chooser
fetches as soon as the user selects it. It registers the file with the browser as
a `FontFace` and keeps the bytes, which is enough for the pane to fill in exactly
as it does for an installed font: the sample paragraph in the real face, the
letter shapes, the coverage check. Nothing is written to the machine and nothing
survives a reload — this is a preview, not an install.

When the user settles on such a font, `onFontSelected` is called with a third
argument, a `DownloadedFontFile` carrying the bytes, the URL they came from and
the catalog entry. A host that really installs fonts, or bundles them into a
document, takes it from there without fetching the same megabyte twice. The
argument is absent for a font that was already on the machine.

**Metered connections.** Fetching a megabyte the moment a name is clicked is the
wrong default for a phone on a paid connection, so the chooser holds off where it
has reason to think the connection is expensive: the `constrainedNetwork` prop,
OR'd with the Network Information API's `saveData` and a slow `effectiveType`.
The pane then offers a **Preview this font** button with the download's size under
it (a HEAD request reads `Content-Length`; a host that already knows the size
passes `downloadSizeBytes` and no request is made). A fetch that fails turns the
button into **Try again** whichever mode is in force.

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

The host's own controls sit inside a box headed **Component Test Harness**, so that
what is under test is unmistakably the card below it. The log at the foot of that box
is the demo's `onDiagnostic` sink, with the cancel and font-chosen events in the same
stream.

**Downloading.** Clicking a font that isn't on the machine fetches it and the pane
fills in — the chooser does this itself now, so the demo has no download plumbing of
its own. Choosing such a font logs the byte count the host was handed, which is what
`onFontSelected`'s third argument is for. The **Simulate metered connection** switch
feeds `constrainedNetwork`, so the held-back "Preview this font" button can be seen
from a desk; Chrome DevTools' 3G throttling reaches the same behaviour through the
browser's own signals.

For hosts that want the Google Fonts catalog instead, `fetchGoogleFontsCatalog` in
`@ethnolib/font-core` is still there; see [Google Fonts](#google-fonts) above for
the key it needs.

## Status

All strings are hardcoded English. Lingui localization is deferred, matching the
current state of the character variants package.
