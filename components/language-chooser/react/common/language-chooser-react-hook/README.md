> [!warning]
> This project is currently under development and not ready for public use.

# Language Chooser React Hook

A React hook which uses the [find-language](../../../common/find-language/README.md) to provide the logic for a language chooser React component such as [MUI Language Chooser](../language-chooser-react-mui/README.md).

## Usage

Install with npm: `npm i @ethnolib/language-chooser-react-hook`

### Props

- `searchResultModifier: (
  results: FuseResult<ILanguage>[],
  searchString: string
) => ILanguage[]` - Can be used to add, remove, and modify results. See [find-language](../../../common/find-language/README.md) for details.

### Returns

<!-- TODO Supermaven wrote these. Need revision -->

- `languageData: ILanguage[]` - A list of languages, the search results from fuzzy-searching `searchString` against the language database.
- `selectedLanguage: ILanguage | undefined` - If the user has selected a language, the currently selected language otherwise undefined.
- `selectedScript: IScript | undefined` - If the user has selected a script, the currently selected script otherwise undefined.
- `customizableLanguageDetails: ICustomizableLanguageDetails` - The details of the currently selected language, including the display name and region.
- `searchString: string` - The search string entered by the user.
- `onSearchStringChange: (searchString: string) => void` - Called when the user changes the search string.
- `toggleSelectLanguage: (language: ILanguage) => void` - Called when the user selects a language.
- `toggleSelectScript: (script: IScript) => void` - Called when the user selects a script.
- `isReadyToSubmit: boolean` - True if the user has selected a language and script, and the search string is not empty.
- `saveLanguageDetails: (
  details: ICustomizableLanguageDetails,
  script?: IScript
) => void` - Called when the user saves the selected language and script details.
- `selectUnlistedLanguage: () => void` - Called when the user selects the unlisted language button.
- `resetTo: (initialState: IOrthography) => void` - Called when the user resets the chooser to a previous state.

### Example

See Mui React [LanguageChooser](../../language-chooser-react-mui/src/LanguageChooser.tsx) for an example of how to use the hook.

## Development

See the main [README](../../README.md).
