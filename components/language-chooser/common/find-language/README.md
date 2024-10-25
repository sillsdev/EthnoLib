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

Use `searchForLanguage` to search for languages by name (including autonyms, exonyms, or alternative names), associated regions, or ISO 639 tags matching the search string argument. It returns a `FuseResult<ILanguage>[]`, which we recommend passing into a search result modifier. See details in Search Result Modification section.

### Search Result Modification

This package includes various methods for adjusting search results to handle special cases, such as sign languages and very common languages. Currently, edge cases in the search results are adjusted for Bloom’s use case by the `defaultSearchResultModifier`, which:

- Demarcates portions (substrings) of results which match the search string. For example, if the search string is "nglis" then any instance of "English" would be marked as "E[nglis]h"
- Ensures the English result is the first result when the user starts typing "English"
- Ensures the French result is the first result when the user starts typing "French", "Francais" or "Français"
- Simplifies English and French entries by removing region lists and most alternative names
- Excludes certain langtags.json entries that don't represent specific extant human languages, such as zxx (no linguistic content) or ang (Old English)
- Filters out Braille and script codes that do not refer to specific relevant scripts from script options

The `searchResultModifiers.ts` file includes various helper methods that can be used to create modifiers suitable for different use cases.

### Macrolanguages

For details of macrolanguage handling, see [macrolanguageNotes.md](macrolanguageNotes.md).

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
    "iso639_3_code": "eng",
    "languageSubtag": "en",
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

## Development

See the main [README](../../../../README.md).

### Language data processing pipeline

If you modify [langtagProcessing.ts](./langtagProcessing.ts), run `npm run find-language/common/langtag-processing` to update [languageData.json](language-data/languageData.json) and [equivalentTags.json](language-data/equivalentTags.json).

#### ISO-639-3 language consolidation

find-language searches languages included in the ISO-639-3 standard; every result returned will have a unique ISO-639-3 code. The entries listed in our source database, langtags.json, are combinations of languages, scripts, regions, and/or variants. [langtagProcessing.ts](./langtagProcessing.ts) consolidates these entries by their ISO-639-3 code and saves the result to [languageData.json](language-data/languageData.json) for searching. For example, langtags.json has separate entries for Abhaz with Cyrillic script, Abhaz with Georgian script, and Abhaz with Latin script. langtagProcessing.ts will combine these into a single entry which lists all three possible scripts and has the superset of the names, regions, etc. of the three entries from langtags.json. This way the search results will contain at most one entry for the language Abhaz.

#### Language tag shortening

The [createTag](./languageTagUtils.ts) function in this package will return the shortest (and thus preferred) tag for a given language/script/region/dialect combination. For example, given language code "emm" (Mamulique), script code "Latn" (Latin) and region code "MX" (Mexico), `createTag` will return "emm" because it is the preferred equivalent tag for emm-Latn-MX.

[langtags.txt](https://github.com/silnrsi/langtags/blob/master/doc/tagging.md#langtagstxt) lists equivalent language tags. langtagProcessing.ts reformats it into [equivalentTags.json](language-data/equivalentTags.json) which we use for mapping language tags to their shortest and maximal equivalents.

### Unit tests

`Find-language` uses Vitest for unit testing. Use nx to run tests:

```
nx test @ethnolib/find-language
```
