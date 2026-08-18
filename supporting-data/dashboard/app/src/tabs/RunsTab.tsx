// Every importer run the database remembers, newest first.
//
// The counts are the importer's own tally of what it did, and the deltas beside
// them are arithmetic against the previous run of the same tool — nothing here
// judges a run, it reports what the two `import_run` rows say happened.

import type { ReactNode } from "react";

import { count, plural } from "../lib/format";
import { pairRuns, type CountLine, type PairedRun } from "../lib/runPairing";
import { useDataset } from "../data";
import "./RunsTab.css";

/** "2026-08-18 14:47 UTC" — UTC because that is what the table stores, and a
 * local rendering would make two readers disagree about when a run happened. */
function stamp(iso: string): string {
  return `${new Date(iso).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

function duration(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function deltaText(delta: number | null): string {
  if (delta === null) return "new";
  if (delta === 0) return "±0";
  return delta > 0 ? `+${count(delta)}` : `−${count(-delta)}`;
}

function CountRow({ line, compared }: { line: CountLine; compared: boolean }) {
  return (
    <div className={line.warn ? "run-count warn" : "run-count"}>
      <dt>{line.label}</dt>
      <dd>
        <span className="run-count-value">{count(line.value)}</span>
        {compared && (
          <span
            className={
              line.delta === null ? "run-delta run-delta-new" : "run-delta"
            }
          >
            {deltaText(line.delta)}
          </span>
        )}
      </dd>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="run-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function RunCard({ run }: { run: PairedRun }) {
  const unfinished = run.finishedAt === null;
  const compared = run.previousRunKey !== null;

  return (
    <article className={unfinished ? "run-card unfinished" : "run-card"}>
      <header className="run-head">
        <h3>{stamp(run.startedAt)}</h3>
        <p className="run-tool">{run.tool}</p>
        {unfinished && <p className="run-chip">did not finish</p>}
      </header>

      <dl className="run-facts">
        {run.source && <Fact label="Source">{run.source}</Fact>}
        {run.sourceGeneratedAt && (
          <Fact label="Source snapshot">{stamp(run.sourceGeneratedAt)}</Fact>
        )}
        <Fact label="Duration">
          {run.durationMs === null ? "—" : duration(run.durationMs)}
        </Fact>
        <Fact label="Invoked as">
          <code>{run.invokedAs ?? "—"}</code>
        </Fact>
      </dl>

      {unfinished ? (
        <p className="run-unfinished-note">
          No <code>finished</code> row was written for this run key, so the
          database has no counts for it.
        </p>
      ) : (
        <>
          <p className="run-counts-lede">
            {run.counts.length ? (
              <>
                {count(run.counts.length)} {plural(run.counts.length, "count")}
                {compared
                  ? ", each with its change since the previous run of this tool"
                  : "; the earliest recorded run of this tool, so nothing to compare against"}
              </>
            ) : (
              "The finished row recorded no counts."
            )}
          </p>
          {run.counts.length > 0 && (
            <dl className="run-counts">
              {run.counts.map((line) => (
                <CountRow key={line.label} line={line} compared={compared} />
              ))}
            </dl>
          )}
        </>
      )}

      {run.notes && <p className="run-notes">{run.notes}</p>}
    </article>
  );
}

/** The cards themselves, split from the tab so they can be rendered from data
 * alone — by a test, or by a future page that has the runs already. */
export function RunList({ runs }: { runs: PairedRun[] }) {
  return (
    <div className="run-list">
      {runs.map((run) => (
        <RunCard key={run.runKey} run={run} />
      ))}
    </div>
  );
}

export function RunsTab() {
  const runs = useDataset("runs");

  if (runs.state === "error")
    return (
      <section>
        <p className="status error">
          Could not load runs.json: {runs.error.message}
        </p>
      </section>
    );
  if (runs.state === "loading")
    return (
      <section>
        <p className="status">Loading the importer runs…</p>
      </section>
    );

  const paired = pairRuns(runs.data);
  const unfinished = paired.filter((run) => run.finishedAt === null).length;

  return (
    <section>
      {unfinished > 0 && (
        <p className="lede">
          {count(unfinished)} of these {count(paired.length)}{" "}
          {plural(paired.length, "run")} never wrote a finished row.
        </p>
      )}

      <RunList runs={paired} />
    </section>
  );
}
