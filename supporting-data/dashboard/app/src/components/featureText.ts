/**
 * Render a font claim's OpenType feature settings the way SLDR writes them, so
 * the dashboard shows the source's own spelling: `cv43=0 cv46=1`.
 *
 * Deliberately literal. A tag's meaning lives in the font - Charis calls cv43
 * "Capital Eng" - and the same tag can mean something else in another font, so
 * translating one here would need the font binary and a rule about which font's
 * name to trust. Until that exists, showing the tag unchanged is the honest
 * option, and the fallback to compact JSON covers a shape we did not expect.
 */
export function featureText(
  features: Record<string, unknown> | null
): string | null {
  if (!features) return null;

  const entries = Object.entries(features);
  if (!entries.length) return null;

  const flat = entries.every(
    ([, value]) =>
      value === null || ["string", "number", "boolean"].includes(typeof value)
  );
  if (flat)
    return entries
      .map(([key, value]) => `${key}=${value === null ? "null" : String(value)}`)
      .join(" ");

  return JSON.stringify(features);
}
