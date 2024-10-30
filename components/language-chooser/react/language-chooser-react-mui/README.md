> [!warning]
> This project is currently under development and not ready for public use.

# MUI React Language Chooser

A MUI-styled React component that uses the [find-language](../../common/find-language/README.md) and [language-chooser-react-hook](../common/language-chooser-react-hook/README.md) packages to present a language chooser interface.

**See demo on Storybook at [https://sillsdev.github.io/EthnoLib/](https://sillsdev.github.io/EthnoLib/)**

Initially developed for use in [BloomDesktop](https://github.com/BloomBooks/BloomDesktop).

## Usage

### Installation

Requires interfaces, methods, etc. from [@ethnolib/find-language](../../common/find-language/README.md).
Install with npm:

```
npm i @ethnolib/find-language
npm i @ethnolib/language-chooser-react-mui
```

### Sizing

Designed to be used in a dialog. The desired height and width need to be set on the parent dialog (see example below).

### Props

- `searchResultModifier: (
  results: FuseResult<ILanguage>[],
  searchString: string
) => ILanguage[]` - Can be used to add, remove, and modify results. See [find-language](../../common/find-language/README.md) for details.
- `initialState: IOrthography` - The initial state of selections with which to populate the LanguageChooser when it is first opened, e.g. if the user has already selected a language and is modifying it.
- `onClose: (languageSelection: IOrthography | undefined) => void` - This is called when the user clicks the "OK" or "Cancel" button to close the dialog.

### Example

```
/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Dialog } from "@mui/material";
import { LanguageChooser } from "@ethnolib/language-chooser-react-mui";

  <Dialog
    open={open}
    maxWidth={"md"}
    fullWidth={true}
    css={css`
      .MuiDialog-paper {
        height: 586px;
      }
    `}
  >
    <LanguageChooser
      searchResultModifier={defaultSearchResultModifier}
      initialState={{} as IOrthography}
      onClose={handleClose}
    />
  </Dialog>
```

## Development

Run `npm run dev` to quickly start the hot reloading development server. See the main [README](../../../../README.md) for more info.
