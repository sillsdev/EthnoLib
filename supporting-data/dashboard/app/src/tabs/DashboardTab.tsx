// The coverage page, ported from the retired baked page. Its wording is deliberate:
// this project records what sources claim and never asserts what is true of a
// language, and the lede and the callout are where that is said out loud.

import { Meter } from "../components/Meter";
import { count, percent, plural } from "../lib/format";
import { SCRIPT_NAMES } from "../lib/scriptNames";
import { useDataset, type Kind, type ScriptRow } from "../data";

function Tile({ kind, denominator }: { kind: Kind; denominator: number }) {
  return (
    <section className="tile">
      <h3>{kind.label}</h3>
      <p className="value">
        {count(kind.covered)}
        <span className="of"> of {count(denominator)}</span>
      </p>
      <p className="share">
        {percent(kind.covered, denominator)} of writing systems
      </p>
      <Meter part={kind.covered} whole={denominator} slot={kind.slot} />
      <p className="note">
        {count(kind.claims)} {plural(kind.claims, "claim")} gathered
        {kind.rivals
          ? ` · ${count(kind.rivals)} ${plural(
              kind.rivals,
              "writing system"
            )} with rival claims`
          : ""}
      </p>
    </section>
  );
}

function ScriptTableRow({
  row,
  kinds,
  isOther,
}: {
  row: ScriptRow;
  kinds: Kind[];
  /** The folded final row, whose `script` is a phrase rather than a subtag. */
  isOther: boolean;
}) {
  const name = SCRIPT_NAMES[row.script];
  return (
    <tr className={isOther ? "other" : undefined}>
      <th scope="row">
        {isOther ? (
          row.script
        ) : (
          <>
            {name ?? row.script}
            {name && <span className="script-code">{row.script}</span>}
          </>
        )}
      </th>
      <td className="num">
        <span className="cell-value">{count(row.writingSystems)}</span>
      </td>
      {kinds.map((kind) => (
        <td className="num" key={kind.key}>
          <span className="cell-value">{count(row[kind.key])}</span>
          <span className="cell-share">
            {percent(row[kind.key], row.writingSystems)}
          </span>
          <Meter
            part={row[kind.key]}
            whole={row.writingSystems}
            slot={kind.slot}
          />
        </td>
      ))}
    </tr>
  );
}

export function DashboardTab() {
  const coverage = useDataset("coverage");
  const meta = useDataset("meta");

  if (coverage.state === "error")
    return <p className="status error">Could not load coverage.json: {coverage.error.message}</p>;
  if (coverage.state === "loading" || meta.state === "loading")
    return <p className="status">Loading the baked numbers…</p>;

  const { denominator, kinds, anyCovered, claimTotal, preferredTotal, scripts, other } =
    coverage.data;

  return (
    <>
      <p className="lede">
        What we have gathered about writing systems: the characters of an alphabet,
        a few sentences of sample text, which fonts people say work.{" "}
        <strong>This is not a claim about what is true of any language.</strong> It
        is a record of what sources and people have told us, kept so that our
        interfaces can offer something useful and say where it came from.
      </p>

      <section className="hero">
        <p className="label">Writing systems with anything at all</p>
        <p className="figure">{percent(anyCovered, denominator.writingSystems)}</p>
        <p className="figure-detail">
          {count(anyCovered)} of {count(denominator.writingSystems)} writing systems
        </p>
        <p className="sub">
          At least one claim of any kind. The denominator is every writing system in
          SIL's langtags, imported as bare rows precisely so this fraction has an
          honest bottom half.
        </p>
      </section>

      <div className="callout">
        <span>
          <strong>
            {count(preferredTotal)} of {count(claimTotal)} claims are marked
            preferred.
          </strong>{" "}
          Only preferred claims are served to users, and how a claim ever becomes
          preferred is a decision this project has not made. So far this is gathered
          data and nothing more.
        </span>
      </div>

      <h2>By kind of claim</h2>
      <div className="tiles">
        {kinds.map((kind) => (
          <Tile key={kind.key} kind={kind} denominator={denominator.writingSystems} />
        ))}
      </div>

      <h2>By script</h2>
      <div className="table-wrap">
        <table>
          <caption>
            Writing systems in langtags, and how many of them we have each kind of
            claim for. Shares are of that script's own writing systems.
          </caption>
          <thead>
            <tr>
              <th scope="col">Script</th>
              <th scope="col">Writing systems</th>
              {kinds.map((kind) => (
                <th scope="col" key={kind.key}>
                  <span
                    className="swatch"
                    style={{ background: `var(--series-${kind.slot})` }}
                  />
                  {kind.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scripts.map((row) => (
              <ScriptTableRow key={row.script} row={row} kinds={kinds} isOther={false} />
            ))}
            {other && <ScriptTableRow row={other} kinds={kinds} isOther />}
          </tbody>
        </table>
      </div>

      <footer>
        {meta.state === "ready" && (
          <>
            <p>
              Generated {meta.data.generatedAt} from the Ethnolib-Support database.
              The numbers are baked into this page at build time, so they are as fresh
              as the last push, not live.
            </p>
            <p>
              Built from <code>{meta.data.branch}</code> at <code>{meta.data.commit}</code>.
            </p>
          </>
        )}
        <p>
          {count(denominator.nonScript)} of the {count(denominator.total)} imported
          langtags rows name no script (<code>Zxxx</code>, <code>Zyyy</code>,{" "}
          <code>Zzzz</code>) and are left out of every denominator above: an unwritten
          language having no alphabet is not a gap we could fill.
        </p>
      </footer>
    </>
  );
}
