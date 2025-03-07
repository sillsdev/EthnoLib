# Localization with Lingui in EthnoLib

This document describes how localization has been set up in the EthnoLib project using the Lingui library.

## Overview

Localization is implemented using [@lingui/core](https://lingui.dev/), a powerful internationalization framework for JavaScript. The setup includes:

- Translation catalog management (extraction, compilation)
- Runtime language switching
- Support for React components via the `Trans` component and `msg` macro

## Project Structure

```
EthnoLib/
  ├── locales/             # Translation files organized by locale
  │   ├── en/              # English translations
  │   │   ├── messages.po  # Source translation file (editable)
  │   │   └── messages.js  # Compiled translations (generated)
  │   ├── fr/              # French translations
  │   │   ├── messages.po
  │   │   └── messages.js
  │   └── ...              # Other supported languages
  ├── lingui.config.ts     # Lingui configuration
  └── components/
      └── language-chooser/
          └── react/
              └── common/
                  ├── i18n.ts           # i18n initialization
                  └── I18nProvider.tsx  # Provider component
```

## Available Scripts

In the project directory, you can run:

### `npm run extract`

Extracts translatable messages from the codebase and updates the message catalogs.

### `npm run compile`

Compiles message catalogs for production use.

### `npm run add-locale [locale]`

Adds support for a new locale, e.g., `npm run add-locale ja` to add Japanese.

## Usage

### 1. Wrap Your Application with I18nProvider

```tsx
import { I18nProvider } from 'path/to/I18nProvider';

function App() {
  return (
    <I18nProvider locale="en">
      <YourApp />
    </I18nProvider>
  );
}
```

### 2. Translate Text in Components

Using the `Trans` component for JSX content:

```tsx
import { Trans } from '@lingui/macro';

function MyComponent() {
  return (
    <div>
      <h1><Trans id="welcome.title">Welcome to our application</Trans></h1>
      <p><Trans id="welcome.message">Thank you for using our app.</Trans></p>
    </div>
  );
}
```

Using the `msg` macro for string values:

```tsx
import { msg } from '@lingui/macro';

function MyComponent() {
  const title = msg`Welcome to our application`;
  const ariaLabel = msg`Close dialog`;
  
  return (
    <div title={title}>
      <button aria-label={ariaLabel}>X</button>
    </div>
  );
}
```

### 3. Dynamic Language Switching

You can switch languages at runtime:

```tsx
import { useState } from 'react';
import { I18nProvider } from 'path/to/I18nProvider';

function App() {
  const [locale, setLocale] = useState('en');
  
  return (
    <>
      <select 
        value={locale} 
        onChange={(e) => setLocale(e.target.value)}
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="es">Español</option>
      </select>
      
      <I18nProvider locale={locale}>
        <YourApp />
      </I18nProvider>
    </>
  );
}
```

See `components/language-chooser/react/language-chooser-react-mui/src/examples/LinguiExample.tsx` for a complete example.

## Adding a New Translatable String

1. Use the `Trans` component or `msg` macro in your code
2. Run `npm run extract` to update the message catalogs
3. Edit the `.po` files in the `locales` directory with your translations
4. Run `npm run compile` to compile the translations for use
5. Restart your development server to see the changes

## Adding a New Language

1. Run `npm run add-locale [locale]` (e.g., `npm run add-locale ja` for Japanese)
2. Edit the new `.po` file in `locales/[locale]/messages.po` with your translations
3. Run `npm run compile` to compile the translations
4. Update your language selector to include the new language option

## Best Practices

- Use descriptive message IDs that include context (e.g., `header.welcomeMessage` rather than just `welcome`)
- Provide default messages in English as children of the `Trans` component to make development easier
- Keep translations concise and clear for easier maintenance
- Consider using plural forms when necessary with the Lingui plural components

## Further Reading

- [Lingui Documentation](https://lingui.dev/)
- [React Internationalization Guide](https://lingui.dev/tutorials/react)
- [Working with Message Catalogs](https://lingui.dev/tutorials/catalog-of-messages)