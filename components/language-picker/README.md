# Language Picker

This project was initially developed for use in Bloom Desktop.

The `language-picker/common/find-language` module contains the logic for fuzzy-searching languages. This module is designed to be published independently and can be utilized by various frontends. The language database is based on [langtags.json](https://github.com/silnrsi/langtags) and also references [langtags.txt](https://github.com/silnrsi/langtags/blob/master/doc/tagging.md#langtagstxt). It includes various methods for adjusting search results to handle special cases, such as sign languages and very common languages. Currently, edge cases in the search results are adjusted for Bloom’s use case by the `defaultSearchResultModifier`, which:

- Ensures the English result comes up on top when the user starts typing "English"
- Ensures the French result comes up on top when the user starts typing "French", "Francais" or "Français"
- Simplifies English and French entries by removing region lists and most alternative names
- Excludes certain langtags.json entries that don't represent specific extant human languages, such as zxx (no linguistic content) or ang (old english)
- Filters out Braille and script codes that do not refer to specific relevant scripts from script options

The `searchResultModifiers.ts` file includes various helper methods that can be used to create modifiers suitable for different use cases.

The `language-picker/react/language-chooser-react-mui` is a React component which uses the `language-picker/common/find-language` logic to present a language picker interface.

For details of macrolanguage handling, see [macrolanguageNotes.md](macrolanguageNotes.md).

## Project status

> [!warning]
> This project is currently under development and not ready for public use.

## Developing

First, set up Nx if you haven't done so already (see [README.md](../../README.md)).

We recommend installing nx globally, but if you haven't, you can just prefix all the commands with `npx`

Although we recommend installing Nx globally, you can alternatively run the nx commands without a global installation by prefixing them with `npx`, e.g. `npx nx dev @ethnolib/language-chooser-react-mui`.

To locally run a hot-reloading demo of the MUI language chooser: `nx dev @ethnolib/language-chooser-react-mui`

If you make changes to the `find-language` package, you will need to run `nx build @ethnolib/find-language` each time for the frontend (e.g. react mui language chooser demo) to incorporate those changes.

If you modify [langtagProcessing.ts](common/find-language/langtagProcessing.ts), run `npm run find-language/common/langtag-processing` to update [languageData.json](common/find-language/languageData.json).

## Unit tests

Language picker uses vitest for unit testing. . To run tests, use:
`nx test @ethnolib/find-language`
