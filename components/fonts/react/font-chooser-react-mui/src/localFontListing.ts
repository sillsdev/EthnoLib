/**
 * When to keep asking for the machine's fonts.
 *
 * The catch this answers: a host app that passes a `fonts` catalog gives the
 * screen something to draw immediately, so the empty state never appears — and
 * with it went the only way to ask for permission to read the installed fonts.
 * The user was left looking at download icons on fonts already sitting on their
 * computer, with no way to say otherwise.
 */

export interface LocalFontListingState {
  /** Whether the browser has the Local Font Access API at all. */
  supported: boolean;
  /** Whether the host passed a `getLocalFonts` of its own, which needs no permission. */
  hostSupplies: boolean;
  /** How many families we have listed from the machine so far. */
  localCount: number;
  /** Whether a listing attempt is in flight. */
  listing: boolean;
}

/**
 * Whether to show the "list installed fonts" prompt. True while we could list the
 * machine's fonts but haven't yet — which is the whole time the user might be
 * looking at a font of theirs marked as needing a download.
 */
export function shouldOfferLocalFontListing({
  supported,
  hostSupplies,
  localCount,
  listing,
}: LocalFontListingState): boolean {
  if (localCount > 0 || listing) return false;
  return supported || hostSupplies;
}
