# Find-Language

> [!warning]
> This project is currently under development and not ready for public use.

## About

This project was initially developed for use in [BloomDesktop](https://github.com/BloomBooks/BloomDesktop).

This component contains the logic for fuzzy-searching languages, designed to be used by frontend language choosers. The language database is based on [langtags.json](https://github.com/silnrsi/langtags) and also references [langtags.txt](https://github.com/silnrsi/langtags/blob/master/doc/tagging.md#langtagstxt). We use [fuse.js](https://fusejs.io/) for fuzzy-searching.

It also contains various utilities for working with language tags and language information.

<!-- TODO move to usage section? -->

### Search Result Modification

It includes various methods for adjusting search results to handle special cases, such as sign languages and very common languages. Currently, edge cases in the search results are adjusted for Bloom’s use case by the `defaultSearchResultModifier`, which:

- Demarcates the portions (substrings) of results which match the search string. For example, if the search string is "nglis" then any instance of "English" would be marked as "E[nglis]h"
- Ensures the English result is the first result when the user starts typing "English"
- Ensures the French result is the first result when the user starts typing "French", "Francais" or "Français"
- Simplifies English and French entries by removing region lists and most alternative names
- Excludes certain langtags.json entries that don't represent specific extant human languages, such as zxx (no linguistic content) or ang (old english)
- Filters out Braille and script codes that do not refer to specific relevant scripts from script options

The `searchResultModifiers.ts` file includes various helper methods that can be used to create modifiers suitable for different use cases.

### Macrolanguages

For details of macrolanguage handling, see [macrolanguageNotes.md](macrolanguageNotes.md).

### Equivalent tag handling

TODO explain shortest tag handling

## Usage

### Installation

`npm i @ethnolib/find-language`

### Searching for languages

`searchForLanguage` searches for languages with any name (autonyms, exonyms, alternative names), listed region, or ISO 639 tag matching the search string argument.

`searchForLanguage` returns a `FuseResult<ILanguage>[]`.o

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

// In default modification, much of the language info is stripped from the English and French results for simplicity. It also adds bracket demarcation of search string match. See the section on Search Result Modification for details.

// defaultModifiedSearchResults[0]:
/*
  {
    <!-- TODO explain demarcation here... -->
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
*/

// Original English result:
// unmodifiedSearchResults[0] (truncated to save space):
/*
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
*/

```

## Development

About nx - see [root README](../../README.md).

We use npm for package management.

Use nx to build or run development server:

```
nx build @ethnolib/find-language
```

or

```
nx dev @ethnolib/find-language
```

### Language data processing pipeline

TODO explain langtagProcessing.ts

If you modify [langtagProcessing.ts](common/find-language/langtagProcessing.ts), run `npm run find-language/common/langtag-processing` to update [languageData.json](common/find-language/languageData.json).

### Unit tests

`Find-language` Uses vitest for unit testing

```
nx test @ethnolib/find-language
```
