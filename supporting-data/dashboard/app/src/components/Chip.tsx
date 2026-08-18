import type { ReactNode } from "react";

import { SOURCE_LABELS, type SourceKey } from "../lib/claimSources";

/** One claim, summarised, in a grid cell.
 *
 * The leading edge carries the claim's provenance colour (who the evidence came
 * from), never a fill, so the characters inside keep full contrast in both
 * themes. `evidenceCount` is printed only when a claim has more than one
 * evidence row, where it answers "how many sources landed on this" without
 * implying the count settles anything.
 */
export function Chip({
  sources,
  children,
  badge,
  evidenceCount,
  title,
}: {
  /** Distinct source keys behind the claim; the first colours the edge. */
  sources: SourceKey[];
  children: ReactNode;
  /** An orthography label, when the claim names one. */
  badge?: string | null;
  evidenceCount?: number;
  title?: string;
}) {
  const from = `from ${sources.map((key) => SOURCE_LABELS[key]).join(", ")}`;
  return (
    <span
      className={`chip src-${sources[0]}`}
      title={title ? `${title}; ${from}` : from}
    >
      <span className="chip-label">{children}</span>
      {badge && <span className="chip-badge">{badge}</span>}
      {evidenceCount !== undefined && evidenceCount > 1 && (
        <span
          className="chip-count"
          title={`${evidenceCount} evidence rows for this claim`}
        >
          ×{evidenceCount}
        </span>
      )}
    </span>
  );
}
