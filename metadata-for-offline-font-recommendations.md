# Metadata for offline font recommendations in EthnoLib

> **TLDR** — For about **313 KB gzipped** (1.5 MB on disk) of generated JSON, an offline user who picks a language gets the alphabet, the curated font suggestions, letter-shape defaults, and real sample text — the full first screen of the chooser, answered entirely from data inside the app.

## What user problems we are solving

The user's problem is simple to state: "I have this application installed. I want to do something in my language." Between them and that sits the font hurdle — finding a font that will display their language, when they may not know which fonts can, which of the fonts on their computer will silently mangle characters, or that their orthography needs letterforms a font only produces with the right settings. SIL Language Technology applications remove that hurdle: pick your language, and the application knows which fonts will display it properly. The metadata described here is what lets it know, with or without a connection.

## What metadata we bundle

When a user picks a language, the chooser needs four answers before it can show its first screen: what characters the language writes with, which fonts are recommended for it, which letter-shape (OpenType feature) settings those fonts should default to, and a passage of real text to preview in. One generated JSON snapshot answers each:

| Snapshot | Answers | Raw | Gzipped | Entries |
| --- | --- | ---: | ---: | ---: |
| `alphabets.json` | language → exemplar characters | 317 KB | 112 KB | 1,981 |
| `languageFonts.json` | language → curated fonts, script fallbacks, family details | 186 KB | 16 KB | 2,187 langs |
| `fontFeatureDefaults.json` | language → default letter-shape settings | 427 KB | 14 KB | 2,200 |
| `sampleTexts.json` | language → a real passage | 599 KB | 179 KB | 755 |
| **Total** | | **1.53 MB** | **~313 KB** | |

Sample text and alphabets are 93% of the gzipped weight; the two font-mapping snapshots together cost only 30 KB. The data lives behind a separate entry point (`@ethnolib/font-core/bundled`), so hosts that don't use it pay nothing.

### The alphabet: what characters the language writes with

**What it is:** each language's exemplar characters — the letters, marks, and punctuation its orthography actually uses, as curated sets rather than everything its script could theoretically carry. **Where it comes from:** SIL's SLDR, the locale data repository of ~2,400 LDML files maintained by linguists, one per language variety. **How it solves the user's problem:** it fills the alphabet field the user sees and can edit, it is the yardstick the chooser measures every font against — a font missing characters of the alphabet is flagged or filtered, which is the "will it silently mangle my language?" question answered — and when no real sample passage exists, preview text is built from these characters so the preview at least exercises the right ones.

### Curated font recommendations: which fonts to suggest

**What it is:** per-language lists of recommended font families, ordered so the preferred face comes first, plus per-script default rules with region overrides for the languages that have no entry of their own, plus each family's details — display name, downloadable files, license. **Where it comes from:** two SIL sources joined together: silnrsi/fonts' `families.json`, the family catalog behind fonts.languagetechnology.org, and langfontfinder's `fallback.json` rules. **How it solves the user's problem:** this is the suggestion list itself — which fonts SIL's font experts recommend for this language, not just which fonts contain its characters. The regional rules encode judgment no character check can make: Pakistan's languages get Awami Nastaliq because readers there expect Nastaliq letterforms, West African Arabic-script languages get Warsh-friendly faces, and the family details tell the app where to get a recommended font the machine doesn't have.

### Letter-shape defaults: how the letters should look

**What it is:** per-language default OpenType feature settings — which character variants (cvXX) and stylistic sets a font should have switched on for this orthography. **Where it comes from:** the `sil:font` feature declarations in the same SLDR LDML files as the alphabets; 2,200 languages have entries, 519 of them with explicit settings. **How it solves the user's problem:** many orthographies need particular letterforms that a font only produces with the right feature settings — a wrong-shaped letter reads as an error to the community even when the character is technically present. When the user picks a font, the chooser preselects the variants their language expects, so the text looks right without the user ever hearing the words "OpenType feature."

### Sample text: something real to preview in

**What it is:** a genuine passage of running text per language. **Where it comes from:** Google's gflanguages data, the per-language text samples behind fonts.google.com; 755 languages have one. **How it solves the user's problem:** judging a font means seeing it write real words — connected Arabic forms, stacked Devanagari conjuncts, actual diacritic placement — which strings faked from an alphabet cannot show. Languages without a passage fall back to alphabet-derived text.

### How the pieces fit together

Each snapshot is served through a provider that implements the same interface as the SIL web service it stands in for, and runs the same resolution logic: the identical language-tag shortening walk (`sr-Cyrl` finds its data under `sr`) and the same script-default rules with region overrides, reusing the same parsing code so the two cannot drift apart.

Two of the chooser's jobs need no metadata at all: analyzing fonts already on the machine reads their bytes directly, and the language list itself ships with the language chooser. Two others are inherently online and stay that way: downloading a font file the machine doesn't have, and the broad "look up popular fonts" search, which verifies real character coverage by downloading font files.

## How the metadata is generated

Each snapshot has its own generator in `font-core/tools` — `refreshAlphabetsSnapshot.mjs`, `refreshLanguageFontsSnapshot.mjs`, `refreshFontFeatureDefaultsSnapshot.mjs`, `refreshSampleTextsSnapshot.mjs` — each a single `node` command that fetches its upstream source (named per snapshot above), transforms it, and rewrites the JSON in place. The two SLDR-fed generators pull the repository as a tarball and read all ~2,400 LDML files in one pass; alphabets are stored raw and parsed at runtime by the same code the web service's answers go through.

Every generator stamps its output with a generation date and the exact upstream sources, and refuses to write a snapshot that shrinks suspiciously or fails its sanity checks, so a broken upstream fetch cannot quietly replace good data. Regenerating all four before a release is four commands; a CI check on each snapshot's `generatedAt` can enforce that they were run.

---

Measurements taken 15 Aug 2026 against live services · sources: SIL families.json & SLDR, langfontfinder fallback rules, Google gflanguages · companion report: The Minimum Font Bundle — https://claude.ai/code/artifact/0776ba37-64c8-43c9-a73e-95d3618b38ce
