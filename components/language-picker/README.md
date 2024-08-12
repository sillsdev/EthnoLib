# Language Picker

Originally designed for Bloom Desktop.

`language-picker/common/find-language` contains the logic for fuzzy-searching for languages, suitable to be published on its own and usable by various frontends. The database of languages is based on [langtags.json](https://github.com/silnrsi/langtags). Also has various methods for modifying the search results to handle special cases (e.g. sign languages and very common languages).

`language-picker/react/language-chooser-react-mui` is a React component which uses the `language-picker/common/find-language` logic to present a language picker.

TODO about the modifiers and the default modifier

For discussion of macrolanguage handling, see [macrolanguageNotes.md](macrolanguageNotes.md)

## Development

First, set up nx if you haven't already. (See [README.md](../../README.md)).
To locally run a hot-reloading demo of the mui language chooser: ` nx run @ethnolib/language-chooser-react-mui:dev`

If you make changes to the `find-language` package, you will need to run `nx run @ethnolib/find-language:build` every time for the frontend (e.g. react mui language chooser demo) to pick up those changes. TODO NX should have a way to make changes in find-language hot-reload in language-chooser-react-mui but I haven't figured it out yet.

If you make changes to [langtagProcessing.ts](common/find-language/langtagProcessing.ts), run `npm run find-language/common/langtag-processing` to update [languageData.json](common/find-language/languageData.json).

## Unit tests

Language picker uses vitest for unit tests.
`npx nx run @ethnolib/find-language:test`
