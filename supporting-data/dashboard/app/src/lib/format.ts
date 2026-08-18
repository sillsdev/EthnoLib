/** Number and share formatting, ported from the retired baked page so the React
 * page prints the same figures it did. */

export const count = (value: number) => value.toLocaleString("en-US");

/** A share, spelled with a decimal only where rounding to a whole number would flatter it. */
export function percent(part: number, whole: number): string {
  if (!whole) return "0%";
  const share = (part / whole) * 100;
  if (share === 0) return "0%";
  if (share < 10) return `${share.toFixed(1)}%`;
  return `${Math.round(share)}%`;
}

export const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;
