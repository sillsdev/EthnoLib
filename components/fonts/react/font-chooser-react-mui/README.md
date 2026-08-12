# @ethnolib/font-chooser-react-mui

A MUI styled, full-screen React component for choosing a font.

The chooser is a two-pane layout. On the left is the list of available fonts,
each row carrying icons for its license and its download status. On the right is
a detail pane for the selected font: license information, alphabet coverage for
the language being worked in, and the character variant (cvXX) picker, which is
embedded from [`@ethnolib/character-variants-react-mui`](../character-variants-react-mui/README.md).

The download button is currently a no-op callback: the component reports that the
user asked for a font, and the host application decides what that means.

## Fonts that aren't installed yet

A catalog entry with `installed: false` and a `fileUrl` is a font the chooser can
read without the font being on the machine: it fetches the file and reads coverage,
license hints and the letter shapes out of it, so the detail pane says what the
download would actually get you. The letter-shape pickers stay ghosted and "Use
this font" stays disabled until the font is really installed, which is the host
app's job.

## Google Fonts

`fetchGoogleFontsCatalog` turns the [Google Fonts Developer
API](https://developers.google.com/fonts/docs/developer_api) into `FontInfo[]`
ready to pass as the `fonts` prop. Every Google Fonts family is under the OFL,
Apache 2.0 or the Ubuntu Font Licence, so they all come back as `license: "open"`.

```ts
import {
  fetchGoogleFontsCatalog,
  notoOnly,
  guessSubsetsForAlphabet,
} from "@ethnolib/font-chooser-react-mui";

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

The demo offers Google Fonts (the Noto and SIL families) when it has a key, which
it takes from `?googleFontsApiKey=…` on the URL, or from
`VITE_GOOGLE_FONTS_API_KEY` in a `.env.local` in this directory (git-ignored). Get
a key from https://developers.google.com/fonts/docs/developer_api. Without one the
demo shows only the fonts installed on the machine, and says so. What it fetches is
cached in local storage for a day, so reloading doesn't spend quota.

## Status

All strings are hardcoded English. Lingui localization is deferred, matching the
current state of the character variants package.
