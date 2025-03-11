# Localization in EthnoLib

This document explains the localization setup and workflows for this project.

## Structure

- `locales/`: Contains language-specific translation files
  - `[language-code]/`: Directory for each supported language (e.g., `en/`, `fr/`)
    - `messages.po`: Translation file in gettext PO format
    - `messages.ts`: Compiled TypeScript messages for runtime use
- `available-locales.json`: Dynamically generated list of available locales
- `lingui.config.ts`: Configuration for lingui
- `crowdin.yml`: Configuration for Crowdin integration

## Workflow

### Adding/Updating Translations

1. Mark strings for translation in your code using lingui syntax
2. Run extraction command to update PO files (`npm run l10n:extract`)
3. Upload sources to Crowdin(`npm run l10n:upload`)
4. Download translations from Crowdin (`npm run l10n:download`)
5. Compile messages using lingui (`npm run l10n:compile`)

### Crowdin Integration

To use the Crowdin upload and download commands, you must set the `ETHNOLIB_CROWDIN_TOKEN` environment variable to the correct Crowdin API token.

### Managing Available Locales

The project uses a dynamic approach to track available locales:

1. `scripts/update-locales.ts` scans the `locales/` directory for language folders
2. It generates `available-locales.json` containing an array of available locale codes
3. This file is used by the application to determine which languages are available

Run the update script whenever you add or remove language directories:

```
npm run l10n:update-locales
```

### Translation Files

- **PO Files** (`messages.po`): Should only be modified through the extraction process (for English source strings) or via Crowdin (for translations)
- **Compiled Files** (`messages.ts`): Generated files used by the application at runtime

Do not manually edit `messages.ts` files, `messages.po` files, or `available-locales.json` as they are automatically generated or managed through dedicated processes.
