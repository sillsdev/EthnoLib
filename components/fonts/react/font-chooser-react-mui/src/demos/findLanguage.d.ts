/**
 * What the demo needs out of `@ethnolib/find-language`, and all that `tsc` sees of
 * it. The demo really imports the package; this stands in for its types, and
 * `tsconfig.json` maps the package name here to say so.
 *
 * Same reason as the language chooser's slice next door (see languageChooser.d.ts):
 * that package ships no built types in this working tree, so `tsc` falls through to
 * its sources, and those don't currently compile clean — its own `typecheck` script
 * has never been run against them. Rather than make this package's gate wait on
 * another package's, the demo compiles against the two fields it reads.
 */
export interface ILanguage {
  /** The BCP-47 subtag the language data uses, e.g. `ff` for Fulah. */
  languageSubtag: string;
  iso639_3_code: string;
  /** The macrolanguage this one belongs to, where it belongs to one. */
  parentMacrolanguage?: ILanguage;
}

/** The language with exactly this subtag or ISO 639-3 code, if there is one. */
export function getLanguageBySubtag(code: string): ILanguage | undefined;
