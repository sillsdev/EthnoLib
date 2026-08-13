import type { FontInfo } from "./types";

/**
 * What to say to a user who clicks "license" on a font that gives us nowhere to
 * send them.
 *
 * Most fonts installed on a machine are like this: they carry licence wording in
 * their `name` table but no `name` ID 14 saying where that licence is published,
 * so the verdict in the callout above is ours to justify. These are the lines
 * that justify it — where the verdict came from, whatever the host app added, and
 * plainly that there is no page to visit.
 *
 * Pure, and returns sentences rather than markup, so what the pane says can be
 * checked without rendering it.
 */
export function licenseExplanation(font: FontInfo): string[] {
  const lines: string[] = [];

  // "no reliable information" is `describeLicense` giving up, and repeating it
  // as a finding would be worse than saying so.
  if (font.licenseReason && font.licenseReason !== "no reliable information") {
    lines.push(`Read from the font itself: ${font.licenseReason}.`);
  } else {
    lines.push(
      "This font carries no license information we could make sense of."
    );
  }

  if (font.licenseNotes) lines.push(font.licenseNotes);

  lines.push(
    "The font doesn't say where its license is published, so there is no page to send you to."
  );

  return lines;
}
