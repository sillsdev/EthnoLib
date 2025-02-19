> [!warning]
> This project is currently under development and not ready for public use.

# Language Chooser React Hook

A React hook that uses the [find-language](../../../common/find-language/README.md) to provide the logic for a language chooser React component such as [MUI Language Chooser](../../language-chooser-react-mui/README.md).

## Usage

Install with npm: `npm i @ethnolib/language-chooser-react-hook`

### Props

- `searchResultModifier: (
  results: FuseResult<ILanguage>[],
  searchString: string
) => ILanguage[]` - Can be used to add, remove, and modify results. See [find-language](../../../common/find-language/README.md) for details.

### Returns

- `languageData: ILanguage[]` - The list of languages resulting from fuzzy-searching `searchString` against the language database. Automatically updates whenever `searchString` changes.

- `selectedLanguage: ILanguage | undefined` - A React state variable for storing a language selected by the user. Set by `selectLanguage`, `selectUnlistedLanguage`, and `resetTo`. Automatically cleared whenever `searchString` changes.

- `selectedScript: IScript | undefined` - A React state variable for storing a script selected by the user. Set by `selectScript`, `saveLanguageDetails`, and `resetTo`. Automatically cleared whenever `selectedLanguage` changes. When a language with exactly 1 script option is selected, `selectedScript` will automatically be set to that script.

- `customizableLanguageDetails: ICustomizableLanguageDetails` - A React state variable for storing any custom display name, region, or dialect information the user has entered. Set by `saveLanguageDetails` and `resetTo`. Automatically cleared whenever the `selectedLanguage` changes.

- `searchString: string` - A React state variable. Value is set by the `searchString` argument of the most recent call to `onSearchStringChange`.

- `onSearchStringChange: (searchString: string) => void` - Should be called whenever the user makes changes to the search string (debouncing first is recommended).

- `selectLanguage: (language: ILanguage) => void` - Sets `selectedLanguage` to `language`. If selecting a language that has only one script option, this will automatically set `selectedScript` to that script.

- `selectUnlistedLanguage: () => void` - Sets the `selectedLanguage` to "Unknown Language" with code "qaa". To be used for languages that are not in the database.

- `selectManuallyEnteredTagLanguage: (manuallyEnteredTag: string) => void` - Sets the `selectedLanguage` to a language captured by a manually entered language tag i.e. a tag that cannot be created from the normal options and customizations offered by the language chooser. Will set `selectedLanguage` to a language with code `manuallyEnteredTag`, and `manuallyEnteredTag` field storing the manually entered tag.

- `clearLanguageSelection: () => void` - Clears the `selectedLanguage`, `selectedScript`, and `customizableLanguageDetails`.

- `selectScript: (script: IScript) => void` - Sets `selectedScript` to `script`.

- `clearScriptSelection: () => void` - Clears the `selectedScript`.

- `readyToSubmit: boolean` - Returns true if the user has selected a language and, if that language requires a script selection, has selected a script, and we have a nonempty display name for the language.

- `saveLanguageDetails: (details: ICustomizableLanguageDetails, script: IScript | undefined) => void` - Sets `customizableLanguageDetails` and `selectedScript`.

- `resetTo: (searchString: string, selectionLanguageTag?: string, initialCustomDisplayName?: string) => void` - For restoring preexisting data when the LanguageChooser is first opened. Sets `selectedLanguage`, `selectedScript`, and `customizableLanguageDetails` to the values in `initialState`.

### Example

See Mui React [LanguageChooser](../../language-chooser-react-mui/src/LanguageChooser.tsx) for an example usage.

## Development

Changes made here will be automatically reflected in the MUI language chooser dev server: `nx dev @ethnolib/language-chooser-react-mui`.

See the main [README](../../../../../README.md).

### Unit tests

`LanguageChooser-react-hook` uses Vitest for unit testing. Run

```
nx test @ethnolib/language-chooser-react-hook
```

from anywhere in the monorepo, or

```
npm run test
```

from package root.
