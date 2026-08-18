/** A meter: the fill carries the share, the track is the same hue near the
 * surface. Decorative — the value is always printed as text beside it. */
export function Meter({
  part,
  whole,
  slot,
}: {
  part: number;
  whole: number;
  /** Categorical colour slot 1–3. */
  slot: number;
}) {
  const share = whole ? Math.min(100, (part / whole) * 100) : 0;
  return (
    <div
      className="meter"
      style={{ ["--fill" as string]: `var(--series-${slot})` }}
    >
      <div className="meter-fill" style={{ inlineSize: `${share.toFixed(2)}%` }} />
    </div>
  );
}
