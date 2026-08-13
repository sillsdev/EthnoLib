# Suggestion-provider fixtures

Real responses from the services the providers talk to, captured so the tests
reason about the shapes those services actually send rather than shapes we
imagined. Captured 2026-08-13 with:

```sh
curl -o lffThai.json                "https://lff.api.languagetechnology.org/lang/th"
curl -o sldrThai.xml                "https://ldml.api.sil.org/th?inc[]=characters"
curl -o sldrFontFeatures.xml        "https://ldml.api.sil.org/maq?inc[]=special"
curl -o fontsourceAndika.json       "https://api.fontsource.org/v1/fonts/andika"
curl -o fontsourceNotoSansThai.json "https://api.fontsource.org/v1/fonts/noto-sans-thai"
curl -o fontsourceList.raw.json     "https://api.fontsource.org/v1/fonts"
curl -o gflanguagesThai.textproto   "https://raw.githubusercontent.com/googlefonts/lang/main/Lib/gflanguages/data/languages/th_Thai.textproto"
```

Two of them are trimmed, and only by dropping bulk:

- `fontsourceList.json` is ten entries chosen out of the 2096 the catalog
  returned, each one verbatim: `andika`, `noto-sans`, `noto-sans-thai`, `roboto`,
  `aclonica` (Apache-2.0), `ubuntu` (UFL-1.0), `aileron` (CC0-1.0), `comic-mono`
  (MIT), `metropolis` (Unlicense) and `advent-pro`. The three non-open licences
  are there so the licence filter is tested against licences the catalog really
  carries, and `noto-sans-thai` is the only entry claiming the `thai` subset,
  which is what the subset filter is tested on.
- The two per-font files keep their whole real `unicodeRange` — the field the
  coverage check reads — and had their `variants` map cut to weight 400, style
  normal, since the full map is every subset × weight × style and none of it is
  read by anything.

`gflanguagesThai.textproto` is untouched — the whole file as the data set serves
it, `exemplar_chars` block and all. What the sample-text provider needs from it is
the `sample_text` block: ten fields of different lengths, with escaped newlines in
the long ones and escaped quotes in the `punctuation` field above it, so the
unescaping and the block scan are tested against the real thing.

`sldrFontFeatures.xml` is verbatim apart from a comment saying so: one
`<sil:font>` entry carrying OpenType feature settings and two carrying none,
which is what the font-features provider has to tell apart.

`sldrThai.xml` is untouched, and matters as it stands: the main
`<exemplarCharacters>` element sits next to `type="auxiliary"`, `"index"`,
`"numbers"` and `"punctuation"` siblings, which is exactly the file the extraction
regex has to get right.
