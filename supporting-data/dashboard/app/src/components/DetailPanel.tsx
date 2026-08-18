import type { ReactNode } from "react";

import { EvidenceList } from "./EvidenceList";
import { RangeTokens } from "./RangeTokens";
import { featureText } from "./featureText";
import { count, plural } from "../lib/format";
import { characterList, type Compressed } from "../lib/ranges";
import { sourceKeysOf } from "../lib/claimSources";
import type { Evidence, Language } from "../data";

/** One claim in full: its value, the rank it was stored with, and its evidence.
 *
 * The panel reports; it does not arbitrate. Where a language has rival claims
 * they are simply listed side by side, in the order the export wrote them, with
 * no winner marked and no wording about which is right. */
function ClaimBlock({
  heading,
  rank,
  rankNote,
  evidence,
  children,
}: {
  heading: ReactNode;
  rank: string | null;
  rankNote: string | null;
  evidence: Evidence[];
  children?: ReactNode;
}) {
  return (
    <li className={`claim src-${sourceKeysOf(evidence)[0]}`}>
      <p className="claim-heading">{heading}</p>
      {children}
      <p className="claim-rank">
        rank <span className="rank-value">{rank ?? "unset"}</span>
        {rankNote && <span className="rank-note">{rankNote}</span>}
      </p>
      <p className="evidence-label">
        {evidence.length} {plural(evidence.length, "evidence row")}
      </p>
      <EvidenceList evidence={evidence} />
    </li>
  );
}

function Group({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="claim-group">
      <h4>{title}</h4>
      {empty ? <p className="empty-group">Nothing gathered yet.</p> : children}
    </section>
  );
}

export function DetailPanel({
  lang,
  ranges,
}: {
  lang: Language;
  /** One compressed character set per alphabet claim, same order. */
  ranges: Compressed[];
}) {
  return (
    <div className="detail-panel">
      <h3 className="detail-heading">Claims</h3>

      <Group title="Alphabets" empty={!lang.alphabets.length}>
        <ol className="claims">
          {lang.alphabets.map((claim, i) => {
            const characters = characterList(claim.characters);
            return (
              <ClaimBlock
                key={claim.id}
                heading={
                  <>
                    {count(characters.length)} {plural(characters.length, "character")}
                    {claim.orthographyLabel && (
                      <span className="chip-badge">{claim.orthographyLabel}</span>
                    )}
                  </>
                }
                rank={claim.rank}
                rankNote={claim.rankNote}
                evidence={claim.evidence}
              >
                <p className="claim-characters">{characters.join(" ")}</p>
                {ranges[i] && (
                  <p className="claim-ranges">
                    <RangeTokens compressed={ranges[i]} />
                  </p>
                )}
              </ClaimBlock>
            );
          })}
        </ol>
      </Group>

      <Group title="Sample texts" empty={!lang.sampleTexts.length}>
        <ol className="claims">
          {lang.sampleTexts.map((claim) => (
            <ClaimBlock
              key={claim.id}
              heading={
                <>
                  {count(claim.textLength)} {plural(claim.textLength, "character")}
                  {claim.orthographyLabel && (
                    <span className="chip-badge">{claim.orthographyLabel}</span>
                  )}
                </>
              }
              rank={claim.rank}
              rankNote={claim.rankNote}
              evidence={claim.evidence}
            >
              <p className="claim-text">{claim.textPreview}</p>
              {claim.textLength > claim.textPreview.length && (
                <p className="claim-truncated">
                  First {count(claim.textPreview.length)} characters of{" "}
                  {count(claim.textLength)}; the grid carries a preview, not the
                  whole passage.
                </p>
              )}
            </ClaimBlock>
          ))}
        </ol>
      </Group>

      <Group title="Fonts" empty={!lang.fonts.length}>
        <ol className="claims">
          {lang.fonts.map((claim) => {
            const features = featureText(claim.opentypeFeatures);
            return (
              <ClaimBlock
                key={claim.id}
                heading={claim.familyName ?? "unnamed family"}
                rank={claim.rank}
                rankNote={claim.rankNote}
                evidence={claim.evidence}
              >
                <p className="claim-features">
                  OpenType features:{" "}
                  {features ? (
                    <code>{features}</code>
                  ) : (
                    <span className="empty">none recorded</span>
                  )}
                </p>
              </ClaimBlock>
            );
          })}
        </ol>
      </Group>
    </div>
  );
}
