> [!warning]
> This project is currently under development and not ready for public use.

# MUI React Language Chooser

A MUI-styled React component that uses the [find-language](../../common/find-language/README.md) and [language-chooser-react-hook](../common/language-chooser-react-hook/README.md) packages to present a language chooser interface.

**See demo on Storybook at [https://sillsdev.github.io/EthnoLib/](https://sillsdev.github.io/EthnoLib/)**

Initially developed for use in [BloomDesktop](https://github.com/BloomBooks/BloomDesktop).

## Usage

### Installation

Install with npm:

```
npm i @ethnolib/language-chooser-react-mui
```

### Sizing and Colors

The LanguageChooser will grow to fit the size of its parent. Height and width should be set on the parent. An explicit size should be set on its parent. Our recommended size is 1084x586 (to fit on a low-end notebook with windows task bar) but it will work in a variety of sizes.

The Language Chooser will adopt the primary color of the [MUI theme](https://mui.com/material-ui/customization/theming/) and by default derive the card colors from the primary color. This can be overriden with the `languageCardBackgroundColorOverride` and `scriptCardBackgroundColorOverride` props, or by `setting theme.palette.primary.lighter` (used for the language card color) and `theme.palette.primary.lightest` (used for the script card color) in your MUI theme.

### Props

- `searchResultModifier: (
  results: FuseResult<ILanguage>[],
  searchString: string
) => ILanguage[]` - Can be used to add, remove, and modify results. See [find-language](../../common/find-language/README.md) for details.
- `initialSearchString?: string`
- `initialSelectionLanguageTag?: string` - The Language Chooser will open with the language information captured by this language tag being already selected. If the user has already previously selected a language and is using the LanguageChooser to modify their selection, use this to prepopulate with their preexisting selection.

  - We expect this to be a language tag which was output either by this Language Chooser or by the [libPalasso](https://github.com/sillsdev/libpalaso)-based language picker. **The language subtag must be the default language subtag for the language** (the first part of the "tag" field of langtags.json), which may be a 2-letter code even if an equivalent ISO 639-3 code exists. May not corectly handle irregular codes, extension codes, langtags with both macrolanguage code and language code, and other comparably unusual nuances of BCP-47.

  - If the initialSelectionLanguageTag does not have an explicit script subtag, the Language Chooser will select the script implied by the language subtag and region subtag if present. For example, if initialSelectionLanguageTag is "uz" (Uzbek), Latin script will be selected because "uz" is an equivalent language tag to "uz-Latn". If initialSelectionLanguageTag is "uz-AF" (Uzbek, Afghanistan), Arabic script will be selected because "uz-AF" is an equivalent language tag to "uz-Arab-AF".

  - **If an initialSelectionLanguageTag is provided, an initialSearchString must also be provided such that the initially selected language is a result of the search string in order for the selected card to be visible.**

- `initialCustomDisplayName?: string` - If using initialSelectionLanguageTag to prepopulate with a language, this field can be used to prepopulate a customized display name for the language.
- `onSelectionChange?: (orthographyInfo: IOrthography | undefined, languageTag: string | undefined) => void` - Whenever the user makes or unselects a complete language selection, this function will be called with the selected language information or undefined, respectively.
- `rightPanelComponent?: React.ReactNode` - A slot for a component to go in the space on the upper right side of the language chooser. See the Storybook Dialog Demo -> Additional Right Panel Component for an example.
- `actionButtons?: React.ReactNode` - A slot for dialog action buttons, e.g. Ok and Cancel. See the [LanguageChooserDialog.tsx](./src/demos/LanguageChooserDialog.tsx) example.
- `languageCardBackgroundColorOverride?: string` - The language chooser will adopt the primary color of the MUI theme. By default, it will make the language card backgrounds be the primary color but 70% lighter (or use theme.palette.primary.lighter if it is set). If provided, this prop will override this background color behavior. See the Storybook Dialog Demo -> withCardBackgroundColorOverrides for an example.
- `scriptCardBackgroundColorOverride?: string` - The language chooser will adopt the primary color of the MUI theme. By default, it will make the script card backgrounds be the primary color but 88% lighter (or use theme.palette.primary.lightest if it is set). If provided, this prop will override this background color behavior. See the Storybook Dialog Demo -> withCardBackgroundColorOverrides for an example.

### Demos

Run the storybook examples in the [demos](./src/demos/) locally with `nx storybook @ethnolib/language-chooser-react-mui" or try them out at [https://sillsdev.github.io/EthnoLib/](https://sillsdev.github.io/EthnoLib/)

## Development

Run `npm run dev` to quickly start the hot reloading development server. See the main [README](../../../../README.md) for more info.
