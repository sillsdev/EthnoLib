# Ethnolib

> [!warning]
> This project is currently under development and not ready for public use.

## About

This is a small collection of browser components for language apps. Each may be published to its own npm package.

## Components

### [Find-Language](components/language-chooser/common/find-language/README.md)

Fuzzy-search for languages. Based on [langtags.json](https://github.com/silnrsi/langtags). Also includes various utilities for working with language tags and language info.

### [Language Chooser React Hook](components/language-chooser/react/language-chooser-react-hook/README.md)

A React hook with the logic for a language chooser component. Uses the `find-language` component.

### [MUI Language Chooser](components/language-chooser/react/language-chooser-react-mui/README.md)

A MUI styled language chooser interface. Initially developed for use in [BloomDesktop](https://github.com/BloomBooks/BloomDesktop). Uses the `language-chooser-react-hook` component.

## Development

### About the monorepo

Ethnolib is a [monorepo using nx](https://nx.dev/concepts/decisions/why-monorepos).

We recommend installing nx globally.
`npm i -g nx`

But if you don't, you can just prefix all the commands with `npx`

Nx caches builds for efficiency. If at any point you need to clear your local cache, run `nx reset`

### Dependency Versions

TODO
