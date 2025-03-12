> [!warning]
> This project is currently under development and not ready for public use.

# Find-Language

This component contains the logic for fuzzy-searching languages, designed for use by frontend language choosers. The language database is based on [langtags.json](https://github.com/silnrsi/langtags) and also references [langtags.txt](https://github.com/silnrsi/langtags/blob/master/doc/tagging.md#langtagstxt). We use [fuse.js](https://fusejs.io/) for fuzzy-searching.

It also contains various utilities for working with language tags and language information.

This project was initially developed for use in [BloomDesktop](https://github.com/BloomBooks/BloomDesktop).

## Usage

### Installation

`npm i @ethnolib/find-language`

### Searching for languages

Search for languages by name (including autonyms, exonyms, or alternative names), associated regions, or ISO 639 tags matching the search string argument.

There are two alternative functions for getting, ultimately, the same set of languages matching a given search string. `asyncGetAllLanguageResults` gets them all at once, while `asyncSearchForLanguage` lets you get the most relevant results faster. Both are async.

`asyncGetAllLanguageResults` MUST be awaited to obtain the results. It returns all matching results (including fuzzy-matched results), sorted with best matches first, in the form of a `FuseResult<ILanguage>[]`

`asyncSearchForLanguage` MAY be awaited, but it's only necessary if you want to know when all searching is complete. In order to get results as fast as possible and not hold up the event loop, `asyncSearchForLanguage` finds results in batches and passes them back before going on to progressively broader searches. In addition to a `searchString`, it takes a `appendResults: (results: FuseResult<ILanguage>[], forSearchString: string) => boolean` argument which it will call on each batch of new results it progressively finds. `asyncSearchForLanguage` will yield control back to the event loop between each of the queries it internally makes, before calling `appendResults`. `appendResults` should be a function that returns true iff the current search should continue given that `forSearchString` is the `searchString` that `asyncSearchForLanguage` was originally called with. In `language-chooser-react-hook` we use this to abort a search
if the search string has changed. Batches are sorted in order of match closeness and are disjoint from one another; `asyncSearchForLanguage` will never pass the same language result to `appendResults` more than once.

We recommend passing the results from either function into a search result modifier. See details in Search Result Modification section.

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

- Demarcates portions (substrings) of results which match the search string. For example, if the search string is "nglis" then any instance of "English" would be marked as "E[nglis]h"
- Ensures the English result is the first result when the user starts typing "English"
- Ensures the French result is the first result when the user starts typing "French", "Francais" or "Français"
- Simplifies English and French entries by removing region lists and most alternative names
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
    "exonym": "[Engl]i[sh]",
    "iso639_3_code": "[eng]",
    "languageSubtag": "[en]",
    "regionNames": "",
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
    "regionNames": "United States, World, Europe, United Arab Emirates, Antigua and Barbuda, ...",
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

#### Language tag shortening

The [createTag](./languageTagUtils.ts) function in this package will return the shortest (and thus preferred) tag for a given language/script/region/dialect combination. For example, given language code "emm" (Mamulique), script code "Latn" (Latin) and region code "MX" (Mexico), `createTag` will return "emm" because it is the preferred equivalent tag for emm-Latn-MX.

[langtags.txt](https://github.com/silnrsi/langtags/blob/master/doc/tagging.md#langtagstxt) lists equivalent language tags. langtagProcessing.ts reformats it into [equivalentTags.json](language-data/equivalentTags.json) which we use for mapping language tags to their shortest and maximal equivalents.
