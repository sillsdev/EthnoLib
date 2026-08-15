/**
 * `@ethnolib/font-core/bundled` — the four providers that answer from snapshots
 * shipped in this package instead of from the network.
 *
 * A separate entry point because the snapshots are about 1.5MB of JSON. A host
 * that only wants the live providers imports `@ethnolib/font-core` and never
 * touches this module, and none of that JSON reaches its bundle; a host that
 * wants the chooser to work offline imports these and pays for them knowingly,
 * usually pairing each with its live counterpart through the `with*Fallback`
 * helpers on the main entry point.
 *
 * This is the only module that pulls in bundledProviders.ts. Nothing in
 * src/index.ts may, or the JSON would ride along into every host.
 */

export {
  createBundledAlphabetProvider,
  createBundledLanguageFontSuggester,
  createBundledFontFeaturesProvider,
  createBundledSampleTextProvider,
} from "./suggestions/bundledProviders";
export type {
  BundledAlphabetProviderConfig,
  BundledLanguageFontSuggesterConfig,
  BundledFontFeaturesProviderConfig,
  BundledSampleTextProviderConfig,
  BundledAlphabets,
  BundledLanguageFonts,
  BundledFontFeatureDefaults,
  BundledSampleTexts,
  BundledFontFamily,
  BundledScriptDefaultRule,
} from "./suggestions/bundledProviders";
