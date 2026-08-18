import type { Evidence } from "../data";

/** Where one claim came from. Every line is a citation and nothing more: the
 * source is named, linked when it is a document, and its own words are quoted
 * from `details`. Nothing here says a claim is right. */
export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (!evidence.length)
    return <p className="evidence-empty">No evidence rows recorded.</p>;

  return (
    <ul className="evidence">
      {evidence.map((row, i) => (
        <li key={i}>
          <span className="evidence-source">
            {row.source ? (
              row.source.url ? (
                <a href={row.source.url} target="_blank" rel="noopener">
                  {row.source.title}
                </a>
              ) : (
                row.source.title
              )
            ) : (
              // No document behind this one: somebody told us.
              "contributor knowledge"
            )}
            {row.source?.type && (
              <span className="evidence-type">{row.source.type}</span>
            )}
          </span>
          {row.details && <span className="evidence-details">{row.details}</span>}
          {row.submittedVia && (
            <span className="evidence-via">via {row.submittedVia}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
