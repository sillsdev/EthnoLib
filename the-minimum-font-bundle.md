# The Minimum Font Bundle

Which fonts a host app should ship in its installer so a user who has never been online can still be offered a font that works for their language — ranked by what each font adds, priced by what each costs to download. The companion report, Metadata for offline font recommendations in EthnoLib (https://claude.ai/code/artifact/d0b36882-db76-4c67-8f7d-0a688b751cc4), covers the metadata side: how the chooser knows, offline, which fonts to suggest at all.

> **The bundle: twenty-five families, 6.5 MB of installer download in every published style, covering 99% of SIL's 2,187 curated languages.** Twenty are picked by language coverage, five more are the mid-size Indian scripts, picked by speaker count. Andika, the literacy face, rides along for its own reason at another 1.3 MB, for a measured total of **7.7 MB**.
>
> The table shows the trade-off each font buys; where to draw the line belongs to the host, not this report.

## The bundle, font by font: what each adds, what each costs

Coverage counted against SIL's langfontfinder curated database (2,187 languages) · all sizes are compressed download cost in MB

| # | Font | Script / role | Serves | Langs added | Langs total | This font (MB) | Cum. regular (MB) | Cum. all styles (MB) |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Charis | Latin + Cyrillic | nearly every Latin & Cyrillic orthography | 1,873 | 1,873 (86%) | 0.35 | 0.35 | 1.44 |
| 2 | Scheherazade New | Arabic | Arabic, Ajami orthographies | 95 | 1,968 (90%) | 0.14 | 0.48 | 1.73 |
| 3 | Annapurna SIL | Devanagari | Hindi belt & Nepal minority languages | 58 | 2,026 (93%) | 0.12 | 0.60 | 1.96 |
| 4 | Abyssinica SIL | Ethiopic | Amharic, Ge'ez, Blin | 28 | 2,054 (94%) | 0.12 | 0.72 | 2.09 *(no bold)* |
| 5 | Awami Nastaliq | Arabic, Nastaliq *(regional style)* | Balochi, Khowar, Hindko (Pakistan) | 14 | 2,068 (95%) | 0.35 | 1.07 | 2.80 |
| 6 | Noto Sans Tifinagh | Tifinagh | Tachelhit, Kabyle | 11 | 2,079 (95%) | 0.05 | 1.12 | 2.85 *(no bold)* |
| 7 | Khmer Mondulkiri | Khmer | Khmer, Tampuan | 7 | 2,086 (95%) | 0.19 | 1.31 | 3.41 |
| 8 | Noto Sans Miao | Miao (Pollard) | A-Hmao, Lipo | 7 | 2,093 (96%) | 0.04 | 1.35 | 3.45 *(no bold)* |
| 9 | Noto Serif Bengali | Bengali | Bengali, Assamese, Sylheti | 6 | 2,099 (96%) | 0.13 | 1.48 | 3.72 |
| 10 | Harmattan | Arabic, W-African *(regional style)* | Hausa & Kanuri Ajami | 6 | 2,105 (96%) | 0.18 | 1.65 | 4.07 |
| 11 | Noto Serif Tibetan | Tibetan | Tibetan, Dzongkha | 6 | 2,111 (97%) | 0.31 | 1.97 | 4.72 |
| 12 | Padauk | Myanmar | Burmese, Shan | 6 | 2,117 (97%) | 0.07 | 2.03 | 4.86 |
| 13 | Noto Sans Thai | Thai | Thai, Northern Thai | 5 | 2,122 (97%) | 0.04 | 2.07 | 4.93 |
| 14 | Noto Sans Telugu | Telugu | Telugu, Gondi | 5 | 2,127 (97%) | 0.10 | 2.16 | 5.12 |
| 15 | Lateef | Arabic, Sindhi-style *(regional style)* | Sindhi, Gilaki, Hazaragi | 5 | 2,132 (97%) | 0.10 | 2.26 | 5.33 |
| 16 | Noto Sans Tamil | Tamil | Tamil | 5 | 2,137 (98%) | 0.05 | 2.31 | 5.43 |
| 17 | Noto Sans Canadian Aboriginal | Syllabics | Cree, Inuktitut | 4 | 2,141 (98%) | 0.07 | 2.39 | 5.58 |
| 18 | Noto Sans Coptic | Coptic | Old Nubian orthographies | 3 | 2,144 (98%) | 0.04 | 2.43 | 5.62 *(no bold)* |
| 19 | Badami | Kannada | Kannada, Tulu | 3 | 2,147 (98%) | 0.05 | 2.48 | 5.84 |
| 20 | Noto Sans Lao | Lao | Lao | 3 | 2,150 (98%) | 0.04 | 2.52 | 5.91 |
| 21 | Noto Sans Malayalam | Malayalam *(by speakers)* | Malayalam (~35 M), Attapady Kurumba | 2 | 2,152 (98%) | 0.06 | 2.58 | 6.04 |
| 22 | Japa Sans Oriya | Odia *(by speakers)* | Odia (~35 M), Kisan | 2 | 2,154 (98%) | 0.06 | 2.64 | 6.15 |
| 23 | Noto Sans Gujarati | Gujarati *(by speakers)* | Gujarati (~55 M) | 1 | 2,155 (99%) | 0.08 | 2.72 | 6.31 |
| 24 | Noto Sans Gurmukhi | Gurmukhi *(by speakers)* | Punjabi (~30 M) | 1 | 2,156 (99%) | 0.04 | 2.76 | 6.39 |
| 25 | Noto Sans Sinhala | Sinhala *(by speakers)* | Sinhala (~17 M) | 1 | 2,157 (99%) | 0.06 | 2.83 | 6.53 |

## How the table was built

Coverage is counted against SIL's langfontfinder database, which curates font recommendations for 2,187 languages. Every "langs" count and percentage means languages in that database, not languages of the world; the last section covers what falls outside it. Rows 1–20 come from a greedy search over that data: each is the font that satisfies the recommendation for the most languages not yet served by everything above it. Rows 21–25 are a different kind of pick — the mid-size Indian scripts, chosen by speaker count rather than language count, the weighting the greedy pass cannot see (marked *by speakers*).

**Every size in the table is the compressed download cost** (brotli at maximum quality, the honest proxy for a woff2 or an LZMA-compressed installer payload; raw on-disk TTFs are 2–4× larger and don't matter to the person downloading). The two cumulative columns read as "if we stop here, this is what the installer download grows by" — once shipping only regular weights, once shipping every style the family publishes (bold, italic, bold italic). A family's bold compresses to about the same size as its regular, which is why the second track runs roughly double the first; italics exist for only three ranked families and add about 1.0 MB more, most of it Charis at row 1.

- Most rows introduce a script nothing above them can draw — capability gaps. The *regional style* rows are scripts already drawable whose readers expect a different style badly enough that the curated data names a different font: the three extra Arabic faces (Nastaliq for Pakistan, the Warsh-friendly Harmattan for West Africa, Lateef for Sindhi-Persianate areas). *No bold* in the last column marks the four families that publish no bold weight (nor italics); their contribution to the all-styles track is their regular alone, and bold text falls to synthetic emboldening.
- **Italics barely figure.** Most of these scripts have no italic tradition; only Charis, Andika, Khmer Mondulkiri, and Badami publish true italics. They add about 1.0 MB to the all-styles track (Charis accounts for 0.74 MB of it). Several families also publish medium/semibold and other weights, not counted here; none of these families publishes a variable-font package that would let one file cover the weight range.
- **Noto Sans and Noto Serif never appear**: a cmap diff showed their living-orthography coverage is essentially a subset of Charis + Andika; their genuine additions (modern and polytonic Greek, historic Cyrillic) serve no language in the curated data.
- **Measured, not estimated:** a fetched bundle of these twenty-five families in every published style — 52 files, resolved through each family's own default-face naming so the correct cuts are chosen (the Noto families also publish condensed and UI cuts at the same nominal weight) — comes to **17.5 MB on disk and 6.4 MB brotli-compressed**. Adding Andika in all four styles brings it to 56 files, 20.7 MB on disk, **7.7 MB compressed**.

## What the 99% counts, and what it leaves out

The percentages measure coverage of langfontfinder's 2,187 curated languages, and that database is deliberately weighted toward minority languages. Two consequences matter when reading the table.

**Chinese, Japanese, and Korean are not in the missing 1% — they are not in the denominator at all.** The database has no entry for `zh`, `cmn`, `ja`, or `ko`, and no script defaults for Han, Kana, or Hangul. The economics explain why: a single usable CJK face runs 10–15 MB compressed, more than this entire bundle, while every mainstream OS already ships good CJK fonts. Because the chooser merges bundled fonts with the machine's installed fonts, a CJK-language user still gets a working font offered; what no bundle of this size class can do is rescue a CJK user on a machine with no fonts at all. The same OS-covers-it logic applies to Greek, Hebrew, Armenian, and Georgian, which the database does curate but which sit among the languages left uncovered.

**The greedy ranking maximizes language count, not speakers** — a script serving forty small languages outranks one serving fifty-five million people. That is why the mid-size Indian scripts landed outside the greedy top twenty despite their populations, and why they were pulled into the table by hand as rows 21–25: Malayalam (~35 M speakers), Odia (~35 M), Gujarati (~55 M), Punjabi in Gurmukhi (~30 M), and Sinhala (~17 M), together 0.31 MB compressed in regular weights, 0.62 MB with bolds (none publishes italics). What remains uncovered after row 25 splits two ways:

- **Scripts every mainstream OS ships anyway:** Greek, Hebrew (with Yiddish), Armenian, Georgian, Thaana (Dhivehi). Bundling these buys little beyond a consistent face.
- **Scripts an OS likely does not ship** — the cases most like the bundle's core mission: Chakma, Ol Chiki (Santali), Cherokee, Vai, Tai Viet, Lepcha, Limbu, Syloti Nagri, and a few more, each reachable only by its own dedicated font.

So the cut line at twenty-five fonts is a statement of division of labor: the bundle takes the minority scripts the OS underserves plus the Indian scripts whose populations demand it, the OS takes the majority scripts it already serves. Catching CJK is out of reach for any bundle in this weight class and unnecessary on any real OS.

---

Measurements taken 15 Aug 2026 · coverage: SIL langfontfinder curated database · sizes: brotli-compressed downloads · companion report: Metadata for offline font recommendations in EthnoLib — https://claude.ai/code/artifact/d0b36882-db76-4c67-8f7d-0a688b751cc4
