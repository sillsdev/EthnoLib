# Svelte DaisyUI Language Chooser

A DaisyUI-styled Svelte language chooser built on [find-language](../../common/find-language/README.md), `@ethnolib/language-chooser-controller`, and [state-management-svelte](../../../state-management/state-management-svelte/README.md).

The package exports two components:

- `LanguageChooser` for embedding the chooser directly in a page layout.
- `LanguageChooserModal` for opening the chooser inside a native `<dialog>`.

## Installation

Install with npm:

```
npm i @ethnolib/language-chooser-svelte-daisyui
```

This package uses Svelte 5 and DaisyUI styling conventions. Your app should already be configured with Tailwind CSS and DaisyUI so the exported components render with the expected styles.

## Usage

### Modal Component

```svelte
<script lang="ts">
  import type { IOrthography } from "@ethnolib/find-language";
  import { LanguageChooserModal } from "@ethnolib/language-chooser-svelte-daisyui";

  let openChooser = $state(() => {});
  let orthography: IOrthography = $state({});
  let languageTag: string | undefined = $state();
</script>

<button class="btn btn-primary" onclick={openChooser}>
  Choose Language
</button>

<LanguageChooserModal
  bind:show={openChooser}
  bind:orthography
  bind:languageTag
/>
```

When the user confirms their selection, `orthography` and `languageTag` are updated and the dialog closes.

### Inline Component

```svelte
<script lang="ts">
  import type { IOrthography } from "@ethnolib/find-language";
  import { LanguageChooser } from "@ethnolib/language-chooser-svelte-daisyui";

  let selectedOrthography: IOrthography = $state({});
  let selectedTag: string | undefined = $state();

  function handleDismiss() {
    console.log("Chooser dismissed");
  }

  function handleOk(orthography: IOrthography, languageTag?: string) {
    selectedOrthography = orthography;
    selectedTag = languageTag;
  }
</script>

<div class="h-[80vh]">
  <LanguageChooser onDismiss={handleDismiss} onOk={handleOk} />
</div>
```

`LanguageChooser` expects:

- `onDismiss: () => void`
- `onOk: (orthography: IOrthography, languageTag?: string) => void`

## Development

Run the local demo app with:

```
nx dev @ethnolib/language-chooser-svelte-daisyui
```

Build the package with:

```
nx build @ethnolib/language-chooser-svelte-daisyui
```

Run unit tests with:

```
npm run test{once}
```

See the main [README](../../../../README.md) for workspace-level development details.
