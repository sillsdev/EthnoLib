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
  /** How many families we have listed by any route so far. */
  localCount: number;
  /**
   * How many of those are the machine's own installed fonts, rather than files
   * the host app supplied out of its own storage (`location: "disk"`).
   *
   * The two are not the same count, and taking them for the same is what hid the
   * prompt from a host that ships font files: its bundle listed twenty families
   * the moment the screen opened, the list was no longer empty, and the button
   * that asks for permission to read the *machine's* fonts never appeared — so
   * on a profile that had not already granted it, the user's own fonts could
   * never be listed at all.
   */
  machineCount: number;
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
  machineCount,
  listing,
}: LocalFontListingState): boolean {
  if (listing) return false;
  // Where the browser can read installed fonts, the prompt is about those and
  // only those: whatever else is on the list, none of it is the user's fonts.
  if (supported) return machineCount === 0;
  // Without the API the host's list is the only list there is, so anything on
  // it means the question has been answered.
  return hostSupplies && localCount === 0;
}
