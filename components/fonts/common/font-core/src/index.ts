export {
  parseAlphabet,
  affectedCharacters,
  filterVariantsForAlphabet,
  charactersWithVariants,
  representativeSample,
  variantsFor,
  variantsBeyond,
  sortVariantsByCharacter,
  DIGITS,
} from "./alphabet";
export {
  readCharacterVariants,
  readGsubFeatureTags,
  hasOldStyleNumerals,
  isShapeFeatureTag,
  normalizeFontName,
} from "./readCharacterVariants";
export type { CharacterVariant } from "./readCharacterVariants";
export {
  readLicenseHints,
  classifyLicense,
  describeLicense,
  LICENSE_CLASSIFICATION_VERSION,
} from "./fontLicense";
export type {
  FontLicenseCategory,
  FontLicenseHints,
  FontLicenseVerdict,
} from "./fontLicense";
export {
  defaultLicenseCacheStorage,
  licenseCacheKey,
  readCachedLicense,
  readCachedLicenses,
  writeCachedLicense,
  pruneLicenseCache,
} from "./fontLicenseCache";
export type {
  CachedFontLicense,
  LicenseCacheStorage,
} from "./fontLicenseCache";
export { useFontData, normalizeFontDataResult } from "./useFontData";
export type { FontDataResult } from "./useFontData";
export {
  isLocalFontAccessSupported,
  queryLocalFontFamilies,
  loadLocalFontBlob,
  loadLocalFontData,
  loadLocalFontDataByFamily,
  loadLocalFontDataByFamilyWithName,
} from "./localFonts";
export type { LocalFontFamily } from "./localFonts";
export {
  fontBlobHasCharacterVariants,
  scanFamiliesForLicense,
  scanFamiliesForCharacterVariants,
} from "./scanForCharacterVariants";
export type {
  FamilyLicense,
  FamilyScan,
  ScanOptions,
} from "./scanForCharacterVariants";
export {
  readCoverageRanges,
  coversCodePoint,
  coversAlphabet,
} from "./fontCoverage";
export type { FontInfo } from "./fontInfo";
export {
  fetchGoogleFontsCatalog,
  guessSubsetsForAlphabet,
  notoOnly,
} from "./googleFonts";
export type { GoogleFontsOptions } from "./googleFonts";
export type {
  SuggestOptions,
  AlphabetFontSuggester,
  LanguageFontSuggester,
  AlphabetProvider,
  FontFeatureDefault,
  FontFeatureDefaultsProvider,
  SampleTextProvider,
} from "./suggestions/types";
export { createFontsourceSuggester } from "./suggestions/fontsource";
export type { FontsourceSuggesterConfig } from "./suggestions/fontsource";
export { createLanguageFontFinderSuggester } from "./suggestions/languageFontFinder";
export type { LanguageFontFinderConfig } from "./suggestions/languageFontFinder";
export { createSldrAlphabetProvider } from "./suggestions/sldrAlphabet";
export type { SldrAlphabetProviderConfig } from "./suggestions/sldrAlphabet";
export { createSldrFontFeaturesProvider } from "./suggestions/sldrFontFeatures";
export type { SldrFontFeaturesProviderConfig } from "./suggestions/sldrFontFeatures";
export { createGflanguagesSampleTextProvider } from "./suggestions/gflanguagesSampleText";
export type { GflanguagesSampleTextProviderConfig } from "./suggestions/gflanguagesSampleText";
export { parseUnicodeRanges } from "./suggestions/unicodeRanges";
export { parseUnicodeSetToAlphabet } from "./suggestions/unicodeSet";
export {
  readCachedSuggestion,
  writeCachedSuggestion,
  pruneSuggestionCache,
} from "./suggestions/suggestionCache";
export type { SuggestionCacheStorage } from "./suggestions/suggestionCache";
