/** Turning the flat `import_run` table into one record per run.
 *
 * Every importer writes two rows sharing a `run_key`: a `started` row before it
 * touches anything, and a `finished` row carrying the counts. So a run with no
 * `finished` row is one that stopped before writing one — the only trace we have
 * of an importer that fell over, and worth showing rather than hiding.
 *
 * The input type is spelled structurally instead of importing `ImportRun` from
 * ../data, which pulls in React: this file stays compilable on its own so the
 * pairing and diff arithmetic can be exercised by a plain node script. */

export type RunRow = {
  created_at: string;
  run_key: string;
  phase: "started" | "finished";
  tool: string;
  source: string | null;
  source_generated_at: string | null;
  invoked_as: string | null;
  counts: Record<string, number> | null;
  notes: string | null;
};

/** One count key of a finished run, with how it moved since the tool last ran.
 * `delta` is null when the previous run had no such key, and the whole `delta`
 * question is moot when `PairedRun.previousRunKey` is null. */
export type CountLine = {
  label: string;
  value: number;
  delta: number | null;
  /** Keys naming work the importer passed over — "skipped …", "lost races …". */
  warn: boolean;
};

export type PairedRun = {
  runKey: string;
  tool: string;
  source: string | null;
  sourceGeneratedAt: string | null;
  invokedAs: string | null;
  /** The `started` row's timestamp, or the `finished` row's if that is all we have. */
  startedAt: string;
  finishedAt: string | null;
  /** Null while unfinished; otherwise finished minus started, in milliseconds. */
  durationMs: number | null;
  counts: CountLine[];
  notes: string | null;
  /** The run these deltas are measured against, null for a tool's first run. */
  previousRunKey: string | null;
};

const WARNING_KEY = /skipped|lost/i;

/** Count keys alphabetically, with the skipped/lost ones held back to the end so
 * a run's actual output reads first. */
function orderCounts(counts: Record<string, number>): CountLine[] {
  return Object.keys(counts)
    .map((label) => ({
      label,
      value: counts[label],
      delta: null as number | null,
      warn: WARNING_KEY.test(label),
    }))
    .sort((a, b) =>
      a.warn === b.warn ? a.label.localeCompare(b.label) : a.warn ? 1 : -1
    );
}

/**
 * Group `import_run` rows into runs, newest first, filling in each finished
 * run's deltas against the previous finished run of the same tool.
 */
export function pairRuns(rows: RunRow[]): PairedRun[] {
  const byKey = new Map<string, { started?: RunRow; finished?: RunRow }>();
  for (const row of rows) {
    let slot = byKey.get(row.run_key);
    if (!slot) byKey.set(row.run_key, (slot = {}));
    // Duplicate phases would mean a broken writer; last row wins, arbitrarily.
    slot[row.phase] = row;
  }

  const runs: PairedRun[] = [];
  for (const [runKey, { started, finished }] of byKey) {
    const anchor = started ?? finished;
    if (!anchor) continue;
    const startedAt = (started ?? finished!).created_at;
    const finishedAt = finished ? finished.created_at : null;
    runs.push({
      runKey,
      tool: anchor.tool,
      source: anchor.source,
      sourceGeneratedAt: anchor.source_generated_at,
      invokedAs: anchor.invoked_as,
      startedAt,
      finishedAt,
      durationMs:
        finished && started
          ? Date.parse(finished.created_at) - Date.parse(started.created_at)
          : null,
      counts: finished?.counts ? orderCounts(finished.counts) : [],
      // The finished row is where an importer writes what it wants remembered.
      notes: finished?.notes ?? started?.notes ?? null,
      previousRunKey: null,
    });
  }

  runs.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));

  // Oldest to newest, so each finished run can look back at its tool's last one.
  const lastFinished = new Map<string, PairedRun>();
  for (const run of runs) {
    if (!run.finishedAt) continue;
    const previous = lastFinished.get(run.tool);
    if (previous) {
      run.previousRunKey = previous.runKey;
      const before = new Map(previous.counts.map((c) => [c.label, c.value]));
      for (const line of run.counts) {
        const was = before.get(line.label);
        line.delta = was === undefined ? null : line.value - was;
      }
    }
    lastFinished.set(run.tool, run);
  }

  return runs.reverse();
}
