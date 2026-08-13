/**
 * What the demo needs out of `@ethnolib/language-chooser-react-mui`.
 *
 * The demo runs that package from source, through a vite alias (see
 * vite.config.ts). Letting `tsc` follow the same route would drag that package —
 * and `@ethnolib/find-language` behind it — into this package's typecheck, where
 * between them they report dozens of pre-existing errors: the `typecheck` script in
 * each has an empty file list, so their sources have never actually been checked.
 * Rather than make this package's gate depend on fixing two other packages, the
 * demo compiles against the small slice of them it uses, declared here.
 *
 * These are structural stand-ins, not the real types. They carry only the fields
 * the demo reads, and the language and script shapes are only ever passed straight
 * back to the helpers they came from.
 */
declare module "@ethnolib/language-chooser-react-mui" {
  export interface ILanguage {
    autonym?: string;
    exonym?: string;
  }

  export interface IScript {
    code?: string;
    name?: string;
    languageNameInScript?: string;
  }

  export interface IOrthography {
    language?: ILanguage;
    script?: IScript;
  }

  /** Leaves the search results as the chooser found them. */
  export const defaultSearchResultModifier: (
    results: ILanguage[],
    searchString: string
  ) => ILanguage[];

  /** The name to show for a language, in its own script where there is one. */
  export function defaultDisplayName(
    language?: ILanguage,
    script?: IScript
  ): string;

  export const LanguageChooser: import("react").FunctionComponent<{
    searchResultModifier: (
      results: ILanguage[],
      searchString: string
    ) => ILanguage[];
    initialSelectionLanguageTag?: string;
    onSelectionChange?: (
      orthographyInfo: IOrthography | undefined,
      languageTag: string | undefined
    ) => void;
    actionButtons?: import("react").ReactNode;
    uiLanguage?: string;
  }>;
}
