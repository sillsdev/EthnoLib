# Find-Language

This component contains the logic for fuzzy-searching languages, designed for use by frontend language choosers. The language database is based on [langtags.json](https://github.com/silnrsi/langtags) and also references [langtags.txt](https://github.com/silnrsi/langtags/blob/master/doc/tagging.md#langtagstxt). We use [fuse.js](https://fusejs.io/) for fuzzy-searching.

It also contains various utilities for working with language tags and language information.

This project was initially developed for use in [BloomDesktop](https://github.com/BloomBooks/BloomDesktop).

## Usage

### Installation

`npm i @ethnolib/find-language`

### Searching for languages using our database

Search for languages by name (including autonyms, exonyms, or alternative names), associated regions, or ISO 639 tags matching the search string argument.

There are two alternative functions for getting, ultimately, the same set of languages matching a given search string. `searchForLanguage` gets synchronously them all at once, while `asyncSearchForLanguage` lets you get the most relevant results faster.

In order to get results as fast as possible and not hold up the event loop, `asyncSearchForLanguage` finds results in batches (best results first) and passes them back before going on to progressively broader searches. In addition to a `searchString`, it takes a `appendResults: (results: FuseResult<ILanguage>[], forSearchString: string) => boolean` argument which it will call on each batch of new results it progressively finds. `asyncSearchForLanguage` will yield control back to the event loop between each of the queries it internally makes, before calling `appendResults`. Batches are sorted in order of match closeness and are disjoint from one another; `asyncSearchForLanguage` will never pass the same language result to `appendResults` more than once.

We recommend passing the results from either function into a search result modifier. See details in Search Result Modification section.

### Searching for languages using other data

If you need to search through a custom language database or want more control over the search behavior, you can create your own `LanguageSearcher` instance from the `LanguageSearcher` class.

#### Constructor Parameters

```typescript
new LanguageSearcher(
  languageData: any[],
  languageToId: (language: any) => string,
  exactMatchFuseSearchKeys: any[],
  fuzzyMatchFuseSearchKeys: any[],
  additionalFuseOptions?: any,
  customLanguageSpacePadder?: (language: any) => any
)
```

**Parameters:**

- `languageData: any[]` - Array of language objects to search through. These can be any objects with searchable string fields.
- `languageToId: (language: any) => string` - Function to extract a unique identifier from language objects for deduplication. Must return a unique string for each language.
- `exactMatchFuseSearchKeys: any[]` - For exact matching (complete, whole word, start-of-word matches). Each object should have `name` (field name) and `weight` (search priority) properties.
  - Can be a list of the names of the properties to include in the search, e.g. `["iso_code", "name"]` for languageData containing objects in the format like `{iso_code: "eng", name: "English", id: 23, other_info: {}}`
  - Fuse also supports more advanced options for keys to specify nested searches, weighted searches, etc. See https://www.fusejs.io/examples.html#nested-search.
- `fuzzyMatchFuseSearchKeys: any[]` - For fuzzy searching. Should include all exact match keys plus additional fields for broader matching. See `exactMatchFuseSearchKeys` explanation above for format details.
- `additionalFuseOptions?: any` - Optional fuse.js options. You can safely specify: `isCaseSensitive`, `ignoreDiacritics`, `includeScore`, `includeMatches`, `keys`, `threshold`, and `getFn`. See https://www.fusejs.io/api/options.html. **Other options should be used with care.**
- `customLanguageSpacePadder?: (language: any) => any` - Optional function to add spaces around the potential keywords of language objects, for detection of whole-word matches. If not provided, will default to adding spaces before and after the string fields fields from `exactMatchFuseSearchKeys`.

### Match Order

If you search for "foo", the order of results should be in the following order:

1. Complete matches (e.g. "Foo")
2. Other whole word Matches (e.g. "Foo Bar", "Bar Foo", or "Bar Foo Baz")
3. Other prefix matches (e.g. "Foobar" or "Baz Foobar")
4. Other substring matches (e.g. "Barfoo" or "Barfoobaz")
5. Fuzzy matches (e.g. "Fxoo", "Foxbar", or "Barfoxbaz")

Within each of these categories, matches are weighted by which field they match; e.g. all else being equal, a language with an autonym exactly matching the search string will come before a language with a region exactly matching the search string. See `searchForLanguage.ts` for exact weightings. Results that have more matching strings (e.g. both an autonym and an alternative name matching the string) are also given relatively higher weight.

### Search Result Modification

This package includes various methods for adjusting search results to handle special cases, such as sign languages and very common languages. Currently, edge cases in the search results are adjusted for Bloom’s use case by the `defaultSearchResultModifier`, which:

- Demarcates (substrings) of results which match the search string, using square brackets. For example, if the search string is "nglis" then "English" would be marked as "E[nglis]h". Only demarcates once per result, prioritizing whole word matches or start-of-word matches. Only demarcates exact matches, so if the search string is "Englxsh" then nothing of "English" would be demarcated
- Simplifies and prioritizes the cards for very common languages, currently English, French, Spanish and Chinese - removes region lists and most alternative names, filters scripts to those most relevant, and ensures these languages come up on top when users type one of their common names.
- For Chinese, make there be 1 result for the Chinese language, with code `zh`, instead of a macrolanguage card and an individual language card. See macrolanguageNotes.md.
- Excludes certain langtags.json entries that don't represent specific extant human languages, such as zxx (no linguistic content) or ang (Old English)
- Filters out Braille and script codes that do not refer to specific relevant scripts from script options

The `searchResultModifiers.ts` file includes various helper methods that can be used to create modifiers suitable for different use cases.

### Example

```
import {
  searchForLanguage,
  defaultSearchResultModifier,
  stripResultMetadata,
  ILanguage,
} from '@ethnolib/find-language';
import { FuseResult } from 'fuse.js';

    const searchString = "englisj"; //Fuzzy search will still find English
    const fuseSearchResults: FuseResult<ILanguage>[] = searchForLanguage(searchString);
    const defaultModifiedSearchResults: ILanguage[] = defaultSearchResultModifier(fuseSearchResults);
    const unmodifiedSearchResults: ILanguage[] = stripResultMetadata(defaultModifiedSearchResults);

```

In default modification, much of the language info is stripped from the English and French results for simplicity. It also adds bracket demarcation of search string match. See the section on Search Result Modification for details.

`defaultModifiedSearchResults[0]`:

```
  {
    "exonym": "English",
    "iso639_3_code": "eng",
    "languageSubtag": "en",
    "regionNamesForDisplay": "",
    "regionNamesForSearch": [],
    "names": [],
    "scripts": [
      {
        "code": "Latn",
        "name": "Latin"
      }
    ],
    "variants": "",
    "alternativeTags": []
  }
```

Original English result, `unmodifiedSearchResults[0]` (truncated to save space):

```
  {
    "autonym": "English",
    "exonym": "English",
    "iso639_3_code": "eng",
    "languageSubtag": "en",
    "regionNamesForDisplay": "United States, World, Europe, United Arab Emirates, Antigua and Barbuda, ...",
    "regionNamesForSearch": ...
    "scripts": [
      {
        "code": "Latn",
        "name": "Latin"
      },
      {
        "code": "Brai",
        "name": "Braille"
      },
      {
        "code": "Dsrt",
        "name": "Deseret (Mormon)"
      },
      {
        "code": "Dupl",
        "name": "Duployan stenography Duployan shorthand"
      },
      ...
    ],
    "names": [
      "Anglais",
      "Angleščina",
      "Anglisy",
      "Angličtina",
      "Anglų",
      "Angol",
      ...],
    "alternativeTags": [
      "en-Latn",
      "en-US"
    ]
  }

```

## Macrolanguages

For details of macrolanguage handling, see [macrolanguageNotes.md](macrolanguageNotes.md).

## Development

Changes made here will be automatically reflected in the MUI language chooser dev server: `nx dev @ethnolib/language-chooser-react-mui`.

See the main [README](../../../../README.md) for more information on the nx monorepo and development.

### Unit tests

`Find-language` uses Vitest for unit testing. Run

```
nx test @ethnolib/find-language
```

from anywhere in the monorepo, or

```
npm run test
```

from package root.

### Language data processing pipeline

If you modify [langtagProcessing.ts](./langtagProcessing.ts), run `npm run find-language/common/langtag-processing` to update [languageData.json](language-data/languageData.json) and [equivalentTags.json](language-data/equivalentTags.json).

#### ISO-639-3 language consolidation

find-language searches languages included in the ISO-639-3 standard; every result returned will have a unique ISO-639-3 code. The entries listed in our source database, langtags.json, are combinations of languages, scripts, regions, and/or variants. [langtagProcessing.ts](./langtagProcessing.ts) consolidates these entries by their ISO-639-3 code and saves the result to [languageData.json](language-data/languageData.json) for searching. For example, langtags.json has separate entries for Abhaz with Cyrillic script, Abhaz with Georgian script, and Abhaz with Latin script. langtagProcessing.ts will combine these into a single entry which lists all three possible scripts and has the superset of the names, regions, etc. of the three entries from langtags.json. This way the search results will contain at most one entry for the language Abhaz.

[langtags.txt](https://github.com/silnrsi/langtags/blob/master/doc/tagging.md#langtagstxt) lists equivalent language tags, and langtagProcessing.ts reformats it into [equivalentTags.json](language-data/equivalentTags.json) which we use for mapping language tags to their shortest and maximal equivalents.

**Note: In this package we use individual language tags instead of the macrolanguage tags for individual languages, even if it is common/"canonical" to use a macrolangauge tag for that individual language. See [macrolanguageNotes.md](macrolanguageNotes.md) for details. So in [languageData.json](language-data/languageData.json), the the `languageSubtag` field will always be a specifically individual language code for individual languages.** (There are a few exceptional cases, see [macrolanguageNotes.md](macrolanguageNotes.md).) **However, equivalentTags.json generally contains tags in their "canonical" form.** Use utilities in [languageTagUtils.ts](./languageTagUtils.ts) to convert between "canonical" and specifically individual language tags.

#### Language tag shortening

The [createTagFromOrthography](./languageTagUtils.ts) function in this package will return the shortest (and thus preferred) tag for a given language/script/region/dialect combination. For example, given language code "emm" (Mamulique), script code "Latn" (Latin) and region code "MX" (Mexico), `createTag` will return "emm" because it is the preferred equivalent tag for emm-Latn-MX.

For languages that are representative for a macrolanguage, however, we use the individual language's ISO 639-3 code as the language subtag even if the macrolanguage code is considered the preferred equivalent tag for this language. See [macrolanguageNotes.md](macrolanguageNotes.md) for further explanation.

## Data sources

We get our data from the [langtags repository](https://github.com/silnrsi/langtags/tree/master) and [ISO 639-3](https://iso639-3.sil.org/). All live in the [language-data](./language-data/) folder. In the future, we plan to automate the update of these data files, but currently it is done manually.

- langtags.json
  - source: https://ldml.api.sil.org/langtags.json
  - documentation: https://github.com/silnrsi/langtags/blob/master/doc/langtags.md
- langtags.txt
  - source: https://ldml.api.sil.org/langtags.txt
  - documentation: https://github.com/silnrsi/langtags/blob/master/doc/langtags.md
- iso-639-3.tab
  - source: https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab
  - documentation: https://iso639-3.sil.org/code_tables/download_tables
- iso-639-3-macrolanguages.tab
  - source: https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3-macrolanguages.tab
  - documentation: https://iso639-3.sil.org/code_tables/download_tables

Currently also in the folder, data files compiled by our language data processing (see section above):

- languageData.json
- equivalentTags.json
