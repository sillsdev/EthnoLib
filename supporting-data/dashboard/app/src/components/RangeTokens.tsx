import { allTokens, type Compressed } from "../lib/ranges";

/** Compressed characters, printed as separate tokens so each can carry its own
 * codepoint tooltip. `limit` truncates for a grid cell; the detail panel passes
 * none and shows every token. */
export function RangeTokens({
  compressed,
  limit,
}: {
  compressed: Compressed;
  limit?: number;
}) {
  const tokens = allTokens(compressed);
  if (!tokens.length) return null;

  const shown = limit === undefined ? tokens : tokens.slice(0, limit);
  const hidden = tokens.length - shown.length;

  return (
    <span className="ranges">
      {shown.map((token, i) => (
        <code className="range-token" key={i} title={token.title}>
          {token.label}
        </code>
      ))}
      {hidden > 0 && (
        <span className="more" title={`${tokens.length} tokens in all`}>
          +{hidden} more
        </span>
      )}
    </span>
  );
}
